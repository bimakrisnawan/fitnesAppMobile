// Coach/admin management of the Monthly workout library: workouts are ordered groups of catalog exercises.
import { Router } from "express";
import { z } from "zod";
import { badRequest, notFound } from "../../lib/http-error.js";
import { mediaUrl } from "../../lib/media.js";
import { combineMuscles } from "../../lib/muscles.js";
import { prisma } from "../../lib/prisma.js";
import { youtubeInput } from "../../lib/youtube.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const idParam = z.object({ id: z.uuid() });

const workoutFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable(),
  category: z.enum(["STRENGTH", "CARDIO", "FLEXIBILITY", "SPORT_SPECIFIC"]),
  specialization: z.enum(["RUNNING", "SWIMMING", "GENERAL"]).nullable(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  durationMinutes: z.number().int().min(1).max(300),
  equipmentSetting: z.enum(["GYM", "HOME", "NONE"]),
  equipment: z.array(z.string().trim().min(1).max(50)).max(15),
  youtube: youtubeInput,
  /** "/media/<file>" (from backend/public/media) or a full https URL. */
  thumbnailUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .refine((v) => !v || v.startsWith("/media/") || /^https:\/\//.test(v), "Use /media/<file> or an https:// image URL"),
  isPublished: z.boolean(),
};

const createSchema = z.object({
  ...workoutFields,
  description: workoutFields.description.optional(),
  specialization: workoutFields.specialization.optional(),
  equipment: workoutFields.equipment.default([]),
  youtube: youtubeInput.optional(),
  thumbnailUrl: workoutFields.thumbnailUrl.optional(),
  // New workouts start hidden from members until the coach publishes them.
  isPublished: z.boolean().default(false),
});

/** No defaults: fields left out of an update stay unchanged. */
const updateSchema = z.object(workoutFields).partial();

const itemsSchema = z.object({
  items: z
    .array(
      z.object({
        exerciseId: z.uuid(),
        sets: z.number().int().min(1).max(50).nullable().optional(),
        reps: z.number().int().min(1).max(500).nullable().optional(),
        durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
        restSeconds: z.number().int().min(0).max(600).nullable().optional(),
        notes: z.string().trim().max(300).nullable().optional(),
      }),
    )
    .max(40),
});

const detailInclude = { exercises: { orderBy: { position: "asc" as const }, include: { exercise: true } }, _count: { select: { completions: true } } };

type WorkoutWithItems = Awaited<ReturnType<typeof loadWorkout>>;

async function loadWorkout(id: string) {
  const w = await prisma.workout.findUnique({ where: { id }, include: detailInclude });
  if (!w) throw notFound("Workout not found");
  return w;
}

function view(w: WorkoutWithItems) {
  const { _count, exercises, ...rest } = w;
  return {
    ...rest,
    thumbnailPreview: mediaUrl(rest.thumbnailUrl),
    completions: _count.completions,
    muscles: combineMuscles(exercises.map((e) => e.exercise)),
    exercises: exercises.map((e) => ({
      id: e.id,
      position: e.position,
      sets: e.sets,
      reps: e.reps,
      durationSeconds: e.durationSeconds,
      restSeconds: e.restSeconds,
      notes: e.notes,
      exercise: {
        id: e.exercise.id,
        name: e.exercise.name,
        youtubeVideoId: e.exercise.youtubeVideoId,
        primaryMuscles: e.exercise.primaryMuscles,
        secondaryMuscles: e.exercise.secondaryMuscles,
        equipment: e.exercise.equipment,
      },
    })),
  };
}

export const coachLibraryRouter = Router();
coachLibraryRouter.use(requireAuth, requireRole("COACH", "ADMIN"));

/** Every library workout, including drafts. */
coachLibraryRouter.get("/workouts", async (_req, res) => {
  const workouts = await prisma.workout.findMany({
    orderBy: [{ isPublished: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { exercises: true, completions: true } } },
  });
  res.json({
    workouts: workouts.map(({ _count, ...w }) => ({ ...w, thumbnailPreview: mediaUrl(w.thumbnailUrl), exerciseCount: _count.exercises, completions: _count.completions })),
  });
});

coachLibraryRouter.get("/workouts/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ workout: view(await loadWorkout(id)) });
});

coachLibraryRouter.post("/workouts", async (req, res) => {
  const { youtube, ...data } = createSchema.parse(req.body);
  const w = await prisma.workout.create({ data: { ...data, youtubeVideoId: youtube ?? null } });
  res.status(201).json({ workout: view(await loadWorkout(w.id)) });
});

coachLibraryRouter.put("/workouts/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { youtube, ...data } = updateSchema.parse(req.body);
  const current = await loadWorkout(id);
  if (data.isPublished && current.exercises.length === 0) throw badRequest("Add at least one exercise before publishing");
  await prisma.workout.update({ where: { id }, data: { ...data, ...(youtube !== undefined && { youtubeVideoId: youtube }) } });
  res.json({ workout: view(await loadWorkout(id)) });
});

/** Replaces the workout's exercise list (order = array order). */
coachLibraryRouter.put("/workouts/:id/exercises", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { items } = itemsSchema.parse(req.body);
  const current = await loadWorkout(id);
  if (current.isPublished && items.length === 0) throw badRequest("A published workout needs at least one exercise; unpublish it first");
  const found = await prisma.exercise.count({ where: { id: { in: [...new Set(items.map((i) => i.exerciseId))] } } });
  if (found !== new Set(items.map((i) => i.exerciseId)).size) throw badRequest("Unknown exercise in the list");
  await prisma.$transaction([
    prisma.workoutExercise.deleteMany({ where: { workoutId: id } }),
    prisma.workoutExercise.createMany({ data: items.map((item, i) => ({ ...item, workoutId: id, position: i + 1 })) }),
  ]);
  res.json({ workout: view(await loadWorkout(id)) });
});

/** Deletes a workout nobody has done yet; otherwise just unpublishes it, so members keep their history. */
coachLibraryRouter.delete("/workouts/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const w = await loadWorkout(id);
  if (w._count.completions > 0) {
    await prisma.workout.update({ where: { id }, data: { isPublished: false } });
    res.json({ deleted: false, unpublished: true });
    return;
  }
  await prisma.workout.delete({ where: { id } });
  res.json({ deleted: true });
});
