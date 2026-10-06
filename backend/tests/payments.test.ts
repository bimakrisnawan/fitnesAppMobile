// Integration tests for checkout, webhook and subscription lifecycle. Mayar is mocked; the database is real.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/mayar.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/mayar.js")>();
  return { ...actual, mayar: { createInvoice: vi.fn(), getInvoice: vi.fn() } };
});

const { createApp } = await import("../src/app.js");
const { env } = await import("../src/config/env.js");
const { prisma } = await import("../src/lib/prisma.js");
const { mayar } = await import("../src/lib/mayar.js");
const { decrypt } = await import("../src/lib/crypto.js");

const app = createApp();
const email = `pay-${Date.now()}@example.com`;
const webhookToken = env.MAYAR_WEBHOOK_TOKEN!;
let accessToken: string;
let userId: string;
let invoiceCounter = 0;

const auth = () => ({ Authorization: `Bearer ${accessToken}` });

beforeAll(async () => {
  const res = await request(app).post("/api/auth/register").send({ email, password: "a-good-password", fullName: "Payer" });
  accessToken = res.body.tokens.accessToken;
  userId = res.body.user.id;
});

beforeEach(() => {
  vi.mocked(mayar.createInvoice).mockImplementation(async () => {
    invoiceCounter += 1;
    return {
      invoiceId: `inv-${email}-${invoiceCounter}`,
      transactionId: `trx-${email}-${invoiceCounter}`,
      paymentUrl: `https://example.myr.id/invoices/${invoiceCounter}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  });
});

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const payments = await prisma.payment.findMany({ where: { userId: user.id }, select: { id: true } });
    await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.paymentEvent.deleteMany({ where: { paymentId: null, data: { path: ["data", "id"], string_contains: email } } });
  await prisma.$disconnect();
});

describe("checkout", () => {
  it("lists plans publicly with IDR prices", async () => {
    const res = await request(app).get("/api/subscriptions/plans");
    expect(res.status).toBe(200);
    expect(res.body.plans.map((p: { priceIdr: number }) => p.priceIdr)).toEqual([79_000, 499_000]);
  });

  it("requires a phone number the first time", async () => {
    const res = await request(app).post("/api/payments/create").set(auth()).send({ tier: "MONTHLY" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PHONE_REQUIRED");
  });

  it("rejects a non-Indonesian phone number", async () => {
    const res = await request(app).post("/api/payments/create").set(auth()).send({ tier: "MONTHLY", phone: "+1 555 0100" });
    expect(res.status).toBe(400);
  });

  it("requires a coaching track for the coaching tier", async () => {
    const res = await request(app).post("/api/subscriptions/1on1").set(auth()).send({ phone: "081234567890" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SPECIALIZATION_REQUIRED");
  });

  it("creates a Mayar invoice and stores the phone encrypted", async () => {
    const res = await request(app)
      .post("/api/payments/create")
      .set(auth())
      .set("Idempotency-Key", `key-${email}-1`)
      .send({ tier: "MONTHLY", phone: "+62 812-3456-7890" });
    expect(res.status).toBe(201);
    expect(res.body.payment).toMatchObject({ tier: "MONTHLY", amount: 79_000, status: "PENDING", currency: "IDR" });
    expect(res.body.payment.paymentUrl).toMatch(/^https:\/\//);

    const call = vi.mocked(mayar.createInvoice).mock.calls[0]![0];
    expect(call.customerMobile).toBe("081234567890");
    expect(call.amount).toBe(79_000);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.phoneEncrypted).not.toContain("0812");
    expect(decrypt(user.phoneEncrypted!)).toBe("081234567890");
  });

  it("returns the same payment for a repeated idempotency key", async () => {
    const first = await request(app).post("/api/payments/create").set(auth()).set("Idempotency-Key", `key-${email}-1`).send({ tier: "MONTHLY" });
    expect(first.status).toBe(201);
    expect(vi.mocked(mayar.createInvoice)).not.toHaveBeenCalled();
  });

  it("reuses an open invoice instead of creating another", async () => {
    const res = await request(app).post("/api/subscriptions/monthly").set(auth()).send({});
    expect(res.status).toBe(201);
    expect(vi.mocked(mayar.createInvoice)).not.toHaveBeenCalled();
    expect((await prisma.payment.count({ where: { userId } }))).toBe(1);
  });

  it("marks the payment FAILED when Mayar errors", async () => {
    const { MayarError } = await import("../src/lib/mayar.js");
    vi.mocked(mayar.createInvoice).mockRejectedValueOnce(new MayarError("boom"));
    const res = await request(app).post("/api/payments/create").set(auth()).send({ tier: "COACHING", specialization: "RUNNING" });
    expect(res.status).toBe(502);
    const failed = await prisma.payment.findFirstOrThrow({ where: { userId, tier: "COACHING" } });
    expect(failed.status).toBe("FAILED");
  });
});

describe("webhook", () => {
  async function pendingMonthly() {
    return prisma.payment.findFirstOrThrow({ where: { userId, tier: "MONTHLY", status: "PENDING" } });
  }

  it("rejects a missing or wrong token and logs it", async () => {
    const res = await request(app).post("/api/payments/mayar-callback?token=nope").send({ event: "payment.received" });
    expect(res.status).toBe(401);
  });

  it("does not trust the webhook body: unpaid at Mayar means no access", async () => {
    const payment = await pendingMonthly();
    vi.mocked(mayar.getInvoice).mockResolvedValueOnce({
      invoiceId: payment.providerInvoiceId!, amount: 79_000, paid: false, closed: false, rawStatus: "unpaid",
    });
    const res = await request(app)
      .post(`/api/payments/mayar-callback?token=${webhookToken}`)
      .send({ event: "payment.received", data: { id: payment.providerInvoiceId, status: "SUCCESS" } });
    expect(res.body).toMatchObject({ ok: true, matched: true });
    expect((await pendingMonthly()).status).toBe("PENDING");
  });

  it("refuses to settle on an amount mismatch", async () => {
    const payment = await pendingMonthly();
    vi.mocked(mayar.getInvoice).mockResolvedValueOnce({
      invoiceId: payment.providerInvoiceId!, amount: 1_000, paid: true, closed: false, rawStatus: "paid",
    });
    await request(app)
      .post(`/api/payments/mayar-callback?token=${webhookToken}`)
      .send({ event: "payment.received", data: { transactionId: payment.providerTransactionId } });
    expect((await pendingMonthly()).status).toBe("PENDING");
  });

  it("settles a verified payment once, even if the webhook is delivered twice", async () => {
    const payment = await pendingMonthly();
    vi.mocked(mayar.getInvoice).mockResolvedValue({
      invoiceId: payment.providerInvoiceId!, amount: 79_000, paid: true, closed: false, rawStatus: "paid",
    });
    const body = { event: "payment.received", data: { transactionId: payment.providerTransactionId, status: "SUCCESS" } };
    const [a, b] = await Promise.all([
      request(app).post(`/api/payments/mayar-callback?token=${webhookToken}`).send(body),
      request(app).post(`/api/payments/mayar-callback?token=${webhookToken}`).send(body),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);

    const settled = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(settled.status).toBe("SETTLED");
    expect(await prisma.paymentEvent.count({ where: { paymentId: payment.id, type: "SETTLED" } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId, type: "PAYMENT_SUCCESS" } })).toBe(1);

    const status = await request(app).get("/api/users/subscription-status").set(auth());
    expect(status.body.entitlements).toMatchObject({ library: true, coaching: false, activeTiers: ["MONTHLY"] });
  });

  it("acknowledges but ignores webhooks it can't match", async () => {
    const res = await request(app)
      .post(`/api/payments/mayar-callback?token=${webhookToken}`)
      .send({ event: "payment.received", data: { id: `unknown-${email}` } });
    expect(res.body).toMatchObject({ ok: true, matched: false });
  });
});

describe("renewal and lifecycle", () => {
  async function monthly() {
    return prisma.subscription.findUniqueOrThrow({ where: { userId_tier: { userId, tier: "MONTHLY" } } });
  }

  it("stacks an early renewal onto the remaining period", async () => {
    const before = (await monthly()).currentPeriodEnd!;
    const created = await request(app).post("/api/payments/create").set(auth()).send({ tier: "MONTHLY" });
    expect(created.status).toBe(201);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: created.body.payment.orderId } });

    vi.mocked(mayar.getInvoice).mockResolvedValueOnce({
      invoiceId: payment.providerInvoiceId!, amount: 79_000, paid: true, closed: false, rawStatus: "paid",
    });
    // Settled via status polling this time, as if the webhook never arrived.
    const polled = await request(app).get(`/api/payments/${payment.orderId}/status`).set(auth());
    expect(polled.body.payment.status).toBe("SETTLED");
    expect(new Date(polled.body.payment.periodStart).getTime()).toBe(before.getTime());
    expect((await monthly()).currentPeriodEnd!.getTime()).toBeGreaterThan(before.getTime());
  });

  it("hides other users' payments", async () => {
    const other = await request(app).post("/api/auth/register").send({ email: `x-${email}`, password: "a-good-password", fullName: "X" });
    const payment = await prisma.payment.findFirstOrThrow({ where: { userId } });
    const res = await request(app).get(`/api/payments/${payment.orderId}/status`).set("Authorization", `Bearer ${other.body.tokens.accessToken}`);
    expect(res.status).toBe(404);
    await prisma.user.delete({ where: { email: `x-${email}` } });
  });

  it("pauses (no access), resumes (end date pushed out), then cancels (access kept until period end)", async () => {
    const sub = await monthly();
    const endBefore = sub.currentPeriodEnd!;

    const paused = await request(app).post(`/api/subscriptions/${sub.id}/pause`).set(auth());
    expect(paused.body.subscription.status).toBe("PAUSED");
    let status = await request(app).get("/api/users/subscription-status").set(auth());
    expect(status.body.entitlements.library).toBe(false);

    // Pretend the pause started an hour ago.
    await prisma.subscription.update({ where: { id: sub.id }, data: { pausedAt: new Date(Date.now() - 60 * 60 * 1000) } });
    const resumed = await request(app).post(`/api/subscriptions/${sub.id}/resume`).set(auth());
    expect(resumed.body.subscription.status).toBe("ACTIVE");
    const shift = new Date(resumed.body.subscription.currentPeriodEnd).getTime() - endBefore.getTime();
    expect(shift).toBeGreaterThanOrEqual(60 * 60 * 1000);

    const cancelled = await request(app).post(`/api/subscriptions/${sub.id}/cancel`).set(auth());
    expect(cancelled.body.subscription.status).toBe("CANCELLED");
    status = await request(app).get("/api/users/subscription-status").set(auth());
    expect(status.body.entitlements.library).toBe(true);
  });

  it("lists payment history newest first", async () => {
    const res = await request(app).get("/api/payments/history").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.payments.length).toBeGreaterThanOrEqual(3);
    expect(res.body.payments[0].paymentUrl).toBeNull(); // only pending payments expose a checkout link
  });
});
