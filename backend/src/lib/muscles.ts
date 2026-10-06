import { z } from "zod";

/**
 * Muscle groups shown on the body map. The same ids are used by the mobile app and the coach
 * dashboard (their BodyMap components draw one region per id), so keep the three lists in sync.
 */
export const MUSCLES = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "traps",
  "lats",
  "lower-back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;

export type Muscle = (typeof MUSCLES)[number];

export const muscleList = z.array(z.enum(MUSCLES)).max(MUSCLES.length).transform((m) => [...new Set(m)]);

/** Combines several exercises: a muscle is primary if any exercise targets it primarily. */
export function combineMuscles(items: { primaryMuscles: string[]; secondaryMuscles: string[] }[]) {
  const primary = new Set(items.flatMap((i) => i.primaryMuscles));
  const secondary = new Set(items.flatMap((i) => i.secondaryMuscles).filter((m) => !primary.has(m)));
  return { primary: [...primary], secondary: [...secondary] };
}
