import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { type Payment, Prisma } from "../../generated/prisma/client.js";
import type { PaymentEventType, Specialization, Tier } from "../../generated/prisma/enums.js";
import { decrypt, encrypt } from "../../lib/crypto.js";
import { badRequest, conflict, notFound } from "../../lib/http-error.js";
import { sendMail } from "../../lib/mailer.js";
import { mayar } from "../../lib/mayar.js";
import { prisma } from "../../lib/prisma.js";
import { addBillingPeriod, PLANS } from "../subscriptions/pricing.js";
import { periodEndAfterResume } from "../subscriptions/subscriptions.service.js";

const INVOICE_TTL_MS = 60 * 60 * 1000;
/** Reuse an open invoice instead of creating a new one if it has at least this long left. */
const REUSE_MIN_REMAINING_MS = 10 * 60 * 1000;

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

type Tx = Prisma.TransactionClient;

function logEvent(
  db: Tx | typeof prisma,
  type: PaymentEventType,
  paymentId: string | null,
  data?: Prisma.InputJsonValue,
  meta: RequestMeta = {},
) {
  return db.paymentEvent.create({ data: { type, paymentId, data, ...meta } });
}

function newOrderId(tier: Tier) {
  // Human-readable on receipts and in the Mayar dashboard.
  return `FIT-${tier === "MONTHLY" ? "M" : "C"}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function toPaymentView(p: Payment) {
  return {
    orderId: p.orderId,
    tier: p.tier,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    paymentUrl: p.status === "PENDING" ? p.paymentUrl : null,
    expiresAt: p.expiresAt,
    paidAt: p.paidAt,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    createdAt: p.createdAt,
  };
}

export interface CheckoutInput {
  tier: Tier;
  specialization?: Specialization;
  phone?: string;
  idempotencyKey?: string;
}

/**
 * Starts (or resumes) a checkout: makes sure a subscription row exists for the tier, then returns a
 * Mayar invoice whose hosted page shows the QRIS code. Access is granted only by settlePayment().
 *
 * The Mayar call deliberately happens outside a DB transaction: holding a transaction open across
 * a network call ties up a connection, and a failed call is recorded as FAILED instead.
 */
export async function createCheckout(userId: string, input: CheckoutInput, meta: RequestMeta) {
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.userId !== userId) throw conflict("Idempotency key already used", "IDEMPOTENCY_CONFLICT");
      return toPaymentView(existing);
    }
  }

  if (input.tier === "COACHING" && !input.specialization) {
    throw badRequest("Choose a coaching track: running, swimming or general", "SPECIALIZATION_REQUIRED");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");

  let phone = input.phone;
  if (phone) {
    await prisma.user.update({ where: { id: userId }, data: { phoneEncrypted: encrypt(phone) } });
  } else if (user.phoneEncrypted) {
    phone = decrypt(user.phoneEncrypted);
  } else {
    throw badRequest("A mobile number is required for payment", "PHONE_REQUIRED");
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId_tier: { userId, tier: input.tier } },
    create: { userId, tier: input.tier, specialization: input.specialization },
    update: input.specialization ? { specialization: input.specialization } : {},
  });
  if (subscription.status === "PAUSED") {
    throw conflict("Resume your paused subscription before renewing", "SUBSCRIPTION_PAUSED");
  }

  const open = await prisma.payment.findFirst({
    where: {
      subscriptionId: subscription.id,
      status: "PENDING",
      paymentUrl: { not: null },
      expiresAt: { gt: new Date(Date.now() + REUSE_MIN_REMAINING_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (open) return toPaymentView(open);

  const plan = PLANS[input.tier];
  const expiresAt = new Date(Date.now() + INVOICE_TTL_MS);
  let payment: Payment;
  try {
    payment = await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        orderId: newOrderId(input.tier),
        idempotencyKey: input.idempotencyKey,
        tier: input.tier,
        amount: plan.priceIdr,
        expiresAt,
      },
    });
  } catch (err) {
    // Two requests with the same key raced past the lookup above; the loser returns the winner's payment.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && input.idempotencyKey) {
      const winner = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (winner?.userId === userId) return toPaymentView(winner);
    }
    throw err;
  }

  try {
    const invoice = await mayar.createInvoice({
      customerName: user.fullName,
      customerEmail: user.email,
      customerMobile: phone,
      description: `${plan.name} (${payment.orderId})`,
      amount: plan.priceIdr,
      expiresAt,
      redirectUrl: `${env.PUBLIC_API_URL}/api/payments/return?orderId=${encodeURIComponent(payment.orderId)}`,
      reference: { userId, paymentId: payment.id },
    });
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerInvoiceId: invoice.invoiceId,
        providerTransactionId: invoice.transactionId,
        paymentUrl: invoice.paymentUrl,
        expiresAt: invoice.expiresAt ?? expiresAt,
      },
    });
    await logEvent(prisma, "CREATED", payment.id, { invoiceId: invoice.invoiceId }, meta);
    return toPaymentView(updated);
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    await logEvent(prisma, "PROVIDER_ERROR", payment.id, { message: (err as Error).message }, meta);
    throw err;
  }
}

/**
 * Marks a verified payment as settled and extends the subscription, atomically and idempotently:
 * concurrent webhook deliveries and status polls race on the PENDING → SETTLED claim, and only
 * the winner extends the period. Returns false if the payment was already settled.
 */
export async function settlePayment(paymentId: string, paidAt: Date, meta: RequestMeta = {}): Promise<boolean> {
  const settled = await prisma.$transaction(async (tx) => {
    const claim = await tx.payment.updateMany({
      where: { id: paymentId, status: { in: ["PENDING", "EXPIRED"] } },
      data: { status: "SETTLED", paidAt },
    });
    if (claim.count === 0) return null;

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { subscription: true } });
    const sub = payment.subscription;
    // A payment settling while paused also resumes, keeping the days that were frozen.
    const currentEnd = sub.status === "PAUSED" ? periodEndAfterResume(sub, paidAt) : sub.currentPeriodEnd;
    // Renewing early stacks onto the remaining time; otherwise the new period starts now.
    const periodStart = currentEnd && currentEnd > paidAt ? currentEnd : paidAt;
    const periodEnd = addBillingPeriod(periodStart);

    await tx.payment.update({ where: { id: paymentId }, data: { periodStart, periodEnd } });
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: sub.status === "ACTIVE" && sub.currentPeriodStart ? sub.currentPeriodStart : periodStart,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        pausedAt: null,
      },
    });
    await logEvent(tx, "SETTLED", paymentId, { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }, meta);
    await tx.notification.create({
      data: {
        userId: payment.userId,
        type: "PAYMENT_SUCCESS",
        title: "Payment received",
        body: `${PLANS[payment.tier].name} is active until ${periodEnd.toLocaleDateString("en-GB", { dateStyle: "long" })}.`,
        data: { orderId: payment.orderId },
      },
    });
    return { payment, periodEnd };
  });

  if (!settled) return false;

  // Side effects after commit, so a mail failure can't roll back a payment.
  const user = await prisma.user.findUnique({ where: { id: settled.payment.userId } });
  if (user) {
    await sendMail({
      to: user.email,
      subject: `Receipt ${settled.payment.orderId}`,
      text: [
        `Thanks for your payment, ${user.fullName}.`,
        `Order: ${settled.payment.orderId}`,
        `Plan: ${PLANS[settled.payment.tier].name}`,
        `Amount: Rp ${settled.payment.amount.toLocaleString("id-ID")}`,
        `Active until: ${settled.periodEnd.toLocaleDateString("en-GB", { dateStyle: "long" })}`,
      ].join("\n"),
    }).catch((err) => console.error("Receipt email failed", err));
  }
  return true;
}

/**
 * Asks Mayar for the truth about a payment and applies it. Used by the webhook (after matching)
 * and by status polling, which also covers webhooks that never arrive or can't be matched.
 */
export async function reconcilePayment(payment: Payment, meta: RequestMeta = {}): Promise<Payment> {
  // EXPIRED is rechecked too: a customer can pay moments before the invoice closes and the webhook arrive late.
  if ((payment.status !== "PENDING" && payment.status !== "EXPIRED") || !payment.providerInvoiceId) return payment;

  const invoice = await mayar.getInvoice(payment.providerInvoiceId);
  await logEvent(prisma, "VERIFIED", payment.id, { status: invoice.rawStatus, amount: invoice.amount }, meta);

  if (invoice.paid) {
    if (invoice.amount !== payment.amount) {
      // Never activate on a mismatched amount; leave PENDING for manual review.
      console.error(`Amount mismatch on ${payment.orderId}: expected ${payment.amount}, Mayar says ${invoice.amount}`);
      return payment;
    }
    await settlePayment(payment.id, new Date(), meta);
  } else if (payment.status === "PENDING" && (invoice.closed || (payment.expiresAt && payment.expiresAt < new Date()))) {
    const expired = await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    if (expired.count) await logEvent(prisma, "EXPIRED", payment.id, { status: invoice.rawStatus }, meta);
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

export async function getPaymentForUser(userId: string, orderId: string) {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== userId) throw notFound("Payment not found");
  return payment;
}

export interface WebhookBody {
  event?: string;
  data?: { id?: string; transactionId?: string; status?: string };
}

/**
 * Handles a Mayar webhook whose token has already been checked. The body only tells us *which*
 * payment to look at; whether it's paid always comes from Mayar's API.
 */
export async function handleWebhook(body: WebhookBody, meta: RequestMeta) {
  const ids = [body.data?.transactionId, body.data?.id].filter((v): v is string => typeof v === "string" && v.length > 0);
  // Mayar's docs note the webhook id doesn't always equal the invoice id, so try every combination.
  const payment = ids.length
    ? await prisma.payment.findFirst({
        where: { OR: ids.flatMap((id) => [{ providerTransactionId: id }, { providerInvoiceId: id }]) },
      })
    : null;

  await logEvent(prisma, payment ? "WEBHOOK_RECEIVED" : "WEBHOOK_UNMATCHED", payment?.id ?? null, (body ?? {}) as Prisma.InputJsonValue, meta);
  if (!payment) return { matched: false };

  if (body.event === "payment.received") await reconcilePayment(payment, meta);
  return { matched: true };
}

export async function logRejectedWebhook(body: unknown, meta: RequestMeta) {
  await logEvent(prisma, "WEBHOOK_REJECTED", null, (body ?? null) as Prisma.InputJsonValue, meta);
}
