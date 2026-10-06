import type { Prisma } from "../../generated/prisma/client.js";
import type { EquipmentSetting, FitnessLevel, Specialization, WorkoutCategory } from "../../generated/prisma/enums.js";
import { notFound } from "../../lib/http-error.js";
import { mediaUrl } from "../../lib/media.js";
import { combineMuscles, type Muscle } from "../../lib/muscles.js";
import { prisma } from "../../lib/prisma.js";

export interface WorkoutFilters {
  category?: WorkoutCategory;
  equipment?: EquipmentSetting;
  difficulty?: FitnessLevel;
  specialization?: Specialization;
  /** Workouts with at least one exercise that trains this muscle primarily. */
  muscle?: Muscle;
  q?: string;
  page: number;
  pageSize: number;
}

export async function listWorkouts(filters: WorkoutFilters) {
  const where: Prisma.WorkoutWhereInput = {
    isPublished: true,
    category: filters.category,
    equipmentSetting: filters.equipment,
    difficulty: filters.difficulty,
    specialization: filters.specialization,
    ...(filters.muscle && { exercises: { some: { exercise: { primaryMuscles: { has: filters.muscle } } } } }),
    ...(filters.q && {
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { exercises: { some: { exercise: { name: { contains: filters.q, mode: "insensitive" } } } } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.workout.findMany({
      where,
      orderBy: [{ category: "asc" }, { difficulty: "asc" }, { title: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: {
        _count: { select: { exercises: true } },
        exercises: { select: { exercise: { select: { primaryMuscles: true, secondaryMuscles: true } } } },
      },
    }),
    prisma.workout.count({ where }),
  ]);
  return {
    items: items.map(({ _count, youtubeVideoId, thumbnailUrl, exercises, ...w }) => ({
      ...w,
      thumbnailUrl: mediaUrl(thumbnailUrl),
      hasVideo: !!youtubeVideoId,
      exerciseCount: _count.exercises,
      muscles: combineMuscles(exercises.map((e) => e.exercise)),
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Everyone can see what a workout contains; videos are only included for members (`locked: false`). */
export async function getWorkout(id: string, userId: string, entitled: boolean) {
  const workout = await prisma.workout.findFirst({
    where: { id, isPublished: true },
    include: {
      exercises: { orderBy: { position: "asc" }, include: { exercise: true } },
    },
  });
  if (!workout) throw notFound("Workout not found");

  const [completedCount, last] = await Promise.all([
    prisma.workoutCompletion.count({ where: { userId, workoutId: id } }),
    prisma.workoutCompletion.findFirst({ where: { userId, workoutId: id }, orderBy: { completedAt: "desc" } }),
  ]);

  return {
    id: workout.id,
    title: workout.title,
    description: workout.description,
    category: workout.category,
    specialization: workout.specialization,
    difficulty: workout.difficulty,
    durationMinutes: workout.durationMinutes,
    equipment: workout.equipment,
    equipmentSetting: workout.equipmentSetting,
    thumbnailUrl: mediaUrl(workout.thumbnailUrl),
    locked: !entitled,
    youtubeVideoId: entitled ? workout.youtubeVideoId : null,
    hasVideo: !!workout.youtubeVideoId,
    muscles: combineMuscles(workout.exercises.map((e) => e.exercise)),
    exercises: workout.exercises.map((item) => ({
      id: item.id,
      position: item.position,
      sets: item.sets,
      reps: item.reps,
      durationSeconds: item.durationSeconds,
      restSeconds: item.restSeconds,
      notes: item.notes,
      exercise: {
        id: item.exercise.id,
        name: item.exercise.name,
        description: item.exercise.description,
        equipment: item.exercise.equipment,
        primaryMuscles: item.exercise.primaryMuscles,
        secondaryMuscles: item.exercise.secondaryMuscles,
        alternatives: item.exercise.alternatives,
        youtubeVideoId: entitled ? item.exercise.youtubeVideoId : null,
        hasVideo: !!item.exercise.youtubeVideoId,
      },
    })),
    myCompletions: { count: completedCount, lastCompletedAt: last?.completedAt ?? null },
  };
}

export async function completeWorkout(userId: string, workoutId: string, notes?: string) {
  const workout = await prisma.workout.findFirst({ where: { id: workoutId, isPublished: true }, select: { id: true } });
  if (!workout) throw notFound("Workout not found");
  return prisma.workoutCompletion.create({ data: { userId, workoutId, notes } });
}

export async function listCompletedWorkouts(userId: string, page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.workoutCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        workout: { select: { id: true, title: true, category: true, durationMinutes: true, difficulty: true } },
      },
    }),
    prisma.workoutCompletion.count({ where: { userId } }),
  ]);
  return { items, total, page, pageSize };
}
