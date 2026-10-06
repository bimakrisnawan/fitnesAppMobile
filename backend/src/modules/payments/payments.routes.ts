import { timingSafeEqual } from "node:crypto";
import { type Request, type RequestHandler, Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { Tier } from "../../generated/prisma/enums.js";
import { unauthorized } from "../../lib/http-error.js";
import { indonesianMobile } from "../../lib/phone.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import {
  createCheckout,
  getPaymentForUser,
  handleWebhook,
  logRejectedWebhook,
  reconcilePayment,
  type RequestMeta,
  toPaymentView,
  type WebhookBody,
} from "./payments.service.js";

const checkoutSchema = z.object({
  tier: z.enum(["MONTHLY", "COACHING"]),
  specialization: z.enum(["RUNNING", "SWIMMING", "GENERAL"]).optional(),
  phone: indonesianMobile.optional(),
});
const idempotencyKeySchema = z.string().min(8).max(100).optional();
const PROVIDER_CHECK_INTERVAL_MS = 10_000;

const requestMeta = (req: Request): RequestMeta => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent")?.slice(0, 500),
});

/** 5 checkout attempts per minute per user (spec). Runs after requireAuth. */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => currentUser(req).userId,
  skip: () => env.NODE_ENV === "test",
});

export function checkoutHandler(fixedTier?: Tier): RequestHandler {
  return async (req, res) => {
    const body = checkoutSchema.parse(fixedTier ? { ...req.body, tier: fixedTier } : req.body);
    const idempotencyKey = idempotencyKeySchema.parse(req.get("idempotency-key"));
    const payment = await createCheckout(currentUser(req).userId, { ...body, idempotencyKey }, requestMeta(req));
    res.status(201).json({ payment });
  };
}

function tokenMatches(given: unknown): boolean {
  if (!env.MAYAR_WEBHOOK_TOKEN || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(env.MAYAR_WEBHOOK_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const paymentsRouter = Router();

// ── Unauthenticated: called by Mayar and by the customer's browser ──

paymentsRouter.post("/mayar-callback", async (req, res) => {
  const meta = requestMeta(req);
  if (!tokenMatches(req.query.token)) {
    await logRejectedWebhook(req.body, meta);
    throw unauthorized("Invalid webhook token");
  }
  // 200 even when unmatched, so Mayar doesn't retry something we can't use; it's in the audit log.
  res.json({ ok: true, ...(await handleWebhook(req.body as WebhookBody, meta)) });
});

/** Mayar's redirectUrl must be a web URL; this bounces the customer back into the app. */
paymentsRouter.get("/return", (req, res) => {
  const orderId = typeof req.query.orderId === "string" ? req.query.orderId : "";
  res.redirect(302, `${env.APP_PAYMENT_RETURN_URL}?orderId=${encodeURIComponent(orderId)}`);
});

// ── Authenticated ──

paymentsRouter.use(requireAuth);

paymentsRouter.post("/create", paymentLimiter, checkoutHandler());

paymentsRouter.get("/history", async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: currentUser(req).userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ payments: payments.map(toPaymentView) });
});

/** Polled by the app after checkout. Also checks Mayar directly, in case the webhook is late or lost. */
paymentsRouter.get("/:orderId/status", async (req, res) => {
  const payment = await getPaymentForUser(currentUser(req).userId, req.params.orderId);
  // The app polls every few seconds; ask Mayar at most once per interval per payment.
  const checkedRecently = await prisma.paymentEvent.findFirst({
    where: { paymentId: payment.id, type: "VERIFIED", createdAt: { gt: new Date(Date.now() - PROVIDER_CHECK_INTERVAL_MS) } },
    select: { id: true },
  });
  const current = checkedRecently ? payment : await reconcilePayment(payment, requestMeta(req));
  res.json({ payment: toPaymentView(current) });
});
