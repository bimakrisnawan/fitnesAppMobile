import { type Request, Router } from "express";
import { z } from "zod";
import { MUSCLES } from "../../lib/muscles.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { getEntitlements, requireEntitlement } from "../subscriptions/entitlements.js";
import { completeWorkout, getWorkout, listWorkouts } from "./workouts.service.js";

const categoryEnum = z.enum(["STRENGTH", "CARDIO", "FLEXIBILITY", "SPORT_SPECIFIC"]);

const listQuery = z.object({
  category: categoryEnum.optional(),
  equipment: z.enum(["GYM", "HOME", "NONE"]).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  specialization: z.enum(["RUNNING", "SWIMMING", "GENERAL"]).optional(),
  muscle: z.enum(MUSCLES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const idParam = z.object({ id: z.uuid() });

const list = (req: Request, overrides: Record<string, unknown> = {}) =>
  listWorkouts(listQuery.parse({ ...req.query, ...overrides }));

export const workoutsRouter = Router();
workoutsRouter.use(requireAuth);

// Browsing is open to every signed-in user (it's the shop window); videos and logging need a plan.
workoutsRouter.get("/", async (req, res) => {
  res.json(await list(req));
});

// Aliases from the spec.
workoutsRouter.get("/category/:category", async (req, res) => {
  res.json(await list(req, { category: categoryEnum.parse(req.params.category.toUpperCase()) }));
});
workoutsRouter.get("/search", async (req, res) => {
  res.json(await list(req, { q: req.query.query ?? req.query.q }));
});

workoutsRouter.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { userId, role } = currentUser(req);
  const entitled = role !== "CLIENT" || (await getEntitlements(userId)).library;
  res.json({ workout: await getWorkout(id, userId, entitled) });
});

workoutsRouter.post("/:id/complete", requireEntitlement("library"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { notes } = z.object({ notes: z.string().trim().max(1000).optional() }).parse(req.body ?? {});
  res.status(201).json({ completion: await completeWorkout(currentUser(req).userId, id, notes) });
});
