import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { checkoutHandler, paymentLimiter } from "../payments/payments.routes.js";
import { getEntitlements } from "./entitlements.js";
import { PLANS } from "./pricing.js";
import {
  cancelSubscription,
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
} from "./subscriptions.service.js";

const idParam = z.object({ id: z.uuid() });

export const subscriptionsRouter = Router();

// Public: the plan picker is shown before sign-up.
subscriptionsRouter.get("/plans", (_req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get("/", async (req, res) => {
  const { userId } = currentUser(req);
  const [subscriptions, entitlements] = await Promise.all([listSubscriptions(userId), getEntitlements(userId)]);
  res.json({ subscriptions, entitlements });
});

// Aliases from the spec; both start a checkout for that tier (same as POST /api/payments/create).
subscriptionsRouter.post("/monthly", paymentLimiter, checkoutHandler("MONTHLY"));
subscriptionsRouter.post("/1on1", paymentLimiter, checkoutHandler("COACHING"));

subscriptionsRouter.post("/:id/cancel", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ subscription: await cancelSubscription(currentUser(req).userId, id) });
});

subscriptionsRouter.post("/:id/pause", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ subscription: await pauseSubscription(currentUser(req).userId, id) });
});

subscriptionsRouter.post("/:id/resume", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ subscription: await resumeSubscription(currentUser(req).userId, id) });
});
