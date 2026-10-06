// Demo catalog content. Videos and images are NOT set here: add them in prisma/demo-media.json
// (keyed by the same slugs) and re-run `npm run db:seed`.
import type { Muscle } from "../src/lib/muscles.js";
import type { EquipmentSetting, FitnessLevel, Specialization, WorkoutCategory } from "../src/generated/prisma/enums.js";

export interface Alternative {
  setting: "home" | "minimal" | "outdoor" | "gym";
  replace: string;
  with: string;
  note?: string;
}

export interface ExerciseSeed {
  slug: string;
  /** Muscle ids from src/lib/muscles.ts */
  primary: Muscle[];
  secondary: Muscle[];
  name: string;
  description: string;
  equipment: string[];
  alternatives: Alternative[];
}

export const EXERCISES: ExerciseSeed[] = [
  // ── Lower body ──
  { slug: "goblet-squat", primary: ["quads", "glutes"], secondary: ["abs", "hamstrings"], name: "Goblet Squat", description: "Hold a weight at your chest, sit your hips down between your heels, keep your chest tall, drive up through your whole foot.", equipment: ["dumbbell"],
    alternatives: [{ setting: "home", replace: "dumbbell", with: "backpack filled with books" }, { setting: "minimal", replace: "dumbbell", with: "bodyweight squat with a 3-second lowering" }] },
  { slug: "romanian-deadlift", primary: ["hamstrings", "glutes"], secondary: ["lower-back", "forearms"], name: "Romanian Deadlift", description: "Soft knees, push your hips back until you feel your hamstrings stretch, keep the weight close to your legs, squeeze glutes to stand.", equipment: ["barbell"],
    alternatives: [{ setting: "home", replace: "barbell", with: "two water jugs" }, { setting: "minimal", replace: "barbell", with: "single-leg RDL, bodyweight" }] },
  { slug: "bulgarian-split-squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], name: "Bulgarian Split Squat", description: "Rear foot on a bench, lower straight down until the front thigh is parallel, front knee tracks over the toes.", equipment: ["bench", "dumbbells"],
    alternatives: [{ setting: "home", replace: "bench", with: "sofa or sturdy chair" }, { setting: "outdoor", replace: "bench", with: "park bench" }] },
  { slug: "reverse-lunge", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], name: "Reverse Lunge", description: "Step back, lower the back knee toward the floor, push through the front heel to return.", equipment: [],
    alternatives: [{ setting: "minimal", replace: "reverse lunge", with: "split squat in place", note: "Easier on balance" }] },
  { slug: "step-up", primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"], name: "Step-Up", description: "Whole foot on the box, drive up without pushing off the back leg, control the way down.", equipment: ["box"],
    alternatives: [{ setting: "home", replace: "box", with: "bottom stair" }, { setting: "outdoor", replace: "box", with: "park bench or curb" }] },
  { slug: "single-leg-rdl", primary: ["hamstrings", "glutes"], secondary: ["lower-back", "calves"], name: "Single-Leg Romanian Deadlift", description: "Hinge on one leg with the other leg reaching back, hips square to the floor. Builds the hip stability runners need.", equipment: [],
    alternatives: [{ setting: "minimal", replace: "free standing", with: "hold a wall for balance" }] },
  { slug: "glute-bridge", primary: ["glutes"], secondary: ["hamstrings", "lower-back"], name: "Glute Bridge", description: "Lie on your back, feet flat, drive hips up until knees-hips-shoulders form a line, pause and squeeze.", equipment: [],
    alternatives: [{ setting: "gym", replace: "bodyweight", with: "barbell hip thrust" }] },
  { slug: "calf-raise", primary: ["calves"], secondary: [], name: "Calf Raise", description: "Rise onto the balls of your feet, pause at the top, lower slowly below the step for a full range.", equipment: [],
    alternatives: [{ setting: "home", replace: "flat floor", with: "edge of a stair for more range" }] },

  // ── Upper body ──
  { slug: "push-up", primary: ["chest", "triceps"], secondary: ["shoulders", "abs"], name: "Push-Up", description: "Hands under shoulders, body in one straight line, lower your chest to a fist's height from the floor.", equipment: [],
    alternatives: [{ setting: "minimal", replace: "floor push-up", with: "incline push-up on a table", note: "Easier" }, { setting: "gym", replace: "push-up", with: "dumbbell bench press" }] },
  { slug: "dumbbell-row", primary: ["lats", "traps"], secondary: ["biceps", "forearms", "shoulders"], name: "Dumbbell Row", description: "One hand on a bench, flat back, pull the weight toward your hip, lower under control.", equipment: ["dumbbell", "bench"],
    alternatives: [{ setting: "home", replace: "dumbbell", with: "water jug or loaded backpack" }, { setting: "outdoor", replace: "dumbbell row", with: "inverted row under a low bar" }] },
  { slug: "overhead-press", primary: ["shoulders", "triceps"], secondary: ["traps", "abs"], name: "Overhead Press", description: "Brace your core, press the weights straight overhead, finish with biceps beside your ears.", equipment: ["dumbbells"],
    alternatives: [{ setting: "home", replace: "dumbbells", with: "filled water bottles" }, { setting: "minimal", replace: "overhead press", with: "pike push-up" }] },
  { slug: "pull-up", primary: ["lats", "biceps"], secondary: ["forearms", "traps", "shoulders"], name: "Pull-Up", description: "Hang with straight arms, pull your chest toward the bar, lower all the way down.", equipment: ["pull-up bar"],
    alternatives: [{ setting: "home", replace: "pull-up", with: "towel row on a door" }, { setting: "outdoor", replace: "pull-up bar", with: "playground monkey bars" }, { setting: "gym", replace: "pull-up", with: "lat pulldown" }] },

  // ── Core ──
  { slug: "plank", primary: ["abs"], secondary: ["obliques", "shoulders", "glutes"], name: "Plank", description: "Forearms under shoulders, squeeze glutes, keep a straight line from head to heels. Breathe.", equipment: [], alternatives: [{ setting: "minimal", replace: "full plank", with: "plank from knees", note: "Easier" }] },
  { slug: "side-plank", primary: ["obliques"], secondary: ["abs", "glutes", "shoulders"], name: "Side Plank", description: "Elbow under shoulder, hips high, body in one line. Strengthens the hips for running and swimming.", equipment: [], alternatives: [{ setting: "minimal", replace: "full side plank", with: "side plank from knees" }] },
  { slug: "dead-bug", primary: ["abs"], secondary: ["obliques"], name: "Dead Bug", description: "On your back, arms and knees up. Lower opposite arm and leg slowly while keeping your lower back on the floor.", equipment: [], alternatives: [] },
  { slug: "bird-dog", primary: ["lower-back", "glutes"], secondary: ["abs", "shoulders"], name: "Bird Dog", description: "On hands and knees, reach opposite arm and leg long, keep hips level, return slowly.", equipment: [], alternatives: [] },

  // ── Conditioning ──
  { slug: "jumping-jack", primary: ["calves"], secondary: ["shoulders", "quads"], name: "Jumping Jack", description: "Classic warm-up: jump feet wide while raising arms overhead, return.", equipment: [], alternatives: [{ setting: "minimal", replace: "jumping", with: "step jacks (low impact)" }] },
  { slug: "mountain-climber", primary: ["abs"], secondary: ["shoulders", "quads", "obliques"], name: "Mountain Climber", description: "From a high plank, drive knees toward your chest one after the other, hips low.", equipment: [], alternatives: [{ setting: "minimal", replace: "fast pace", with: "slow, controlled knee drives" }] },
  { slug: "burpee", primary: ["quads", "chest"], secondary: ["shoulders", "triceps", "abs", "calves"], name: "Burpee", description: "Squat, hands down, jump feet back, chest to floor, jump feet in, jump up.", equipment: [], alternatives: [{ setting: "minimal", replace: "jump", with: "step back and stand up (no jump)" }] },

  // ── Mobility ──
  { slug: "cat-cow", primary: ["lower-back"], secondary: ["abs"], name: "Cat-Cow", description: "On hands and knees, round your spine up then let it sink, moving with your breath.", equipment: [], alternatives: [] },
  { slug: "worlds-greatest-stretch", primary: ["hamstrings", "glutes"], secondary: ["obliques", "lower-back"], name: "World's Greatest Stretch", description: "Lunge forward, elbow to the inside of the front foot, then rotate and reach to the ceiling.", equipment: [], alternatives: [] },
  { slug: "hip-flexor-stretch", primary: ["quads"], secondary: ["abs"], name: "Hip Flexor Stretch", description: "Half-kneeling, tuck your pelvis and shift forward until the front of the back hip stretches.", equipment: [], alternatives: [] },
  { slug: "hamstring-stretch", primary: ["hamstrings"], secondary: ["calves", "lower-back"], name: "Hamstring Stretch", description: "Leg straight on a low step, hinge forward from the hips with a flat back.", equipment: [], alternatives: [] },

  // ── Running ──
  { slug: "easy-run", primary: ["quads", "calves"], secondary: ["hamstrings", "glutes"], name: "Easy Run", description: "Conversational pace: you should be able to talk in full sentences. Builds your aerobic base.", equipment: ["running shoes"],
    alternatives: [{ setting: "gym", replace: "road run", with: "treadmill at 1% incline" }] },
  { slug: "interval-run", primary: ["quads", "hamstrings", "calves"], secondary: ["glutes", "abs"], name: "Interval Run", description: "Fast repeats with easy jogging between. Warm up 10 minutes first and cool down after.", equipment: ["running shoes"],
    alternatives: [{ setting: "gym", replace: "track", with: "treadmill intervals" }, { setting: "outdoor", replace: "track", with: "flat road using a watch for distance" }] },
  { slug: "tempo-run", primary: ["quads", "calves"], secondary: ["hamstrings", "glutes"], name: "Tempo Run", description: "Comfortably hard: a pace you could hold for about an hour. Speak only in short phrases.", equipment: ["running shoes"], alternatives: [{ setting: "gym", replace: "road", with: "treadmill" }] },
  { slug: "long-run", primary: ["quads", "calves"], secondary: ["hamstrings", "glutes"], name: "Long Run", description: "The weekly long, slow run. Start easy, stay easy, bring water.", equipment: ["running shoes", "water bottle"], alternatives: [] },

  // ── Swimming ──
  { slug: "freestyle-catch-up", primary: ["lats", "shoulders"], secondary: ["triceps", "abs"], name: "Freestyle Catch-Up Drill", description: "One arm waits in front until the other arm finishes its stroke. Teaches length and timing.", equipment: ["pool"], alternatives: [] },
  { slug: "kick-set", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves", "abs"], name: "Kick Set", description: "Kickboard in front, steady flutter kick from the hips, not the knees.", equipment: ["pool", "kickboard"], alternatives: [{ setting: "minimal", replace: "kickboard", with: "streamline kick on your side" }] },
  { slug: "pull-buoy-set", primary: ["lats", "shoulders", "triceps"], secondary: ["biceps", "forearms"], name: "Pull Buoy Set", description: "Buoy between your thighs, arms only. Focus on a high elbow catch.", equipment: ["pool", "pull buoy"], alternatives: [{ setting: "minimal", replace: "pull buoy", with: "light kick, focus on arms" }] },
  { slug: "swim-intervals", primary: ["lats", "shoulders"], secondary: ["triceps", "quads", "abs"], name: "Freestyle Intervals", description: "Repeats at a strong, even pace with short rest. Hold the same time on every repeat.", equipment: ["pool"], alternatives: [] },
];

export interface WorkoutItemSeed {
  exercise: string; // slug
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutSeed {
  slug: string;
  title: string;
  description: string;
  category: WorkoutCategory;
  specialization?: Specialization;
  difficulty: FitnessLevel;
  durationMinutes: number;
  equipmentSetting: EquipmentSetting;
  equipment: string[];
  items: WorkoutItemSeed[];
}

export const WORKOUTS: WorkoutSeed[] = [
  { slug: "full-body-basics", title: "Full-Body Strength Basics", description: "Five foundational movements to build strength at home. Perfect first workout.", category: "STRENGTH", difficulty: "BEGINNER", durationMinutes: 30, equipmentSetting: "HOME", equipment: ["dumbbell"],
    items: [{ exercise: "goblet-squat", sets: 3, reps: 10, restSeconds: 90 }, { exercise: "push-up", sets: 3, reps: 8, restSeconds: 90 }, { exercise: "dumbbell-row", sets: 3, reps: 10, restSeconds: 90 }, { exercise: "glute-bridge", sets: 3, reps: 12, restSeconds: 60 }, { exercise: "plank", sets: 3, durationSeconds: 30, restSeconds: 45 }] },
  { slug: "no-equipment-hiit", title: "20-Minute No-Equipment HIIT", description: "40 seconds on, 20 seconds off. Four rounds that get your heart rate up anywhere.", category: "CARDIO", difficulty: "INTERMEDIATE", durationMinutes: 20, equipmentSetting: "NONE", equipment: [],
    items: [{ exercise: "jumping-jack", sets: 4, durationSeconds: 40, restSeconds: 20 }, { exercise: "mountain-climber", sets: 4, durationSeconds: 40, restSeconds: 20 }, { exercise: "reverse-lunge", sets: 4, durationSeconds: 40, restSeconds: 20 }, { exercise: "burpee", sets: 4, durationSeconds: 40, restSeconds: 20 }] },
  { slug: "lower-body-gym", title: "Lower Body Power", description: "Hinge, single-leg and calf work for strong legs. Gym session.", category: "STRENGTH", difficulty: "INTERMEDIATE", durationMinutes: 45, equipmentSetting: "GYM", equipment: ["barbell", "dumbbells", "bench", "box"],
    items: [{ exercise: "romanian-deadlift", sets: 4, reps: 8, restSeconds: 120 }, { exercise: "bulgarian-split-squat", sets: 3, reps: 10, restSeconds: 90, notes: "Each leg" }, { exercise: "step-up", sets: 3, reps: 10, restSeconds: 60, notes: "Each leg" }, { exercise: "calf-raise", sets: 3, reps: 15, restSeconds: 45 }] },
  { slug: "upper-body-push-pull", title: "Upper Body Push & Pull", description: "Balanced pressing and pulling for shoulders, chest and back.", category: "STRENGTH", difficulty: "INTERMEDIATE", durationMinutes: 40, equipmentSetting: "GYM", equipment: ["dumbbells", "pull-up bar", "bench"],
    items: [{ exercise: "overhead-press", sets: 4, reps: 8, restSeconds: 90 }, { exercise: "pull-up", sets: 4, reps: 6, restSeconds: 120 }, { exercise: "dumbbell-row", sets: 3, reps: 10, restSeconds: 90 }, { exercise: "push-up", sets: 3, reps: 12, restSeconds: 60 }] },
  { slug: "core-stability", title: "Core Stability in 15", description: "Anti-rotation and bracing work that protects your back. No equipment.", category: "STRENGTH", difficulty: "BEGINNER", durationMinutes: 15, equipmentSetting: "NONE", equipment: [],
    items: [{ exercise: "dead-bug", sets: 3, reps: 10, restSeconds: 30 }, { exercise: "bird-dog", sets: 3, reps: 10, restSeconds: 30 }, { exercise: "side-plank", sets: 2, durationSeconds: 30, restSeconds: 30, notes: "Each side" }, { exercise: "plank", sets: 2, durationSeconds: 45, restSeconds: 30 }] },
  { slug: "morning-mobility", title: "Morning Mobility Flow", description: "Ten easy minutes to loosen hips, spine and hamstrings before your day.", category: "FLEXIBILITY", difficulty: "BEGINNER", durationMinutes: 12, equipmentSetting: "NONE", equipment: [],
    items: [{ exercise: "cat-cow", sets: 1, reps: 10 }, { exercise: "worlds-greatest-stretch", sets: 1, reps: 5, notes: "Each side" }, { exercise: "hip-flexor-stretch", sets: 1, durationSeconds: 45, notes: "Each side" }, { exercise: "hamstring-stretch", sets: 1, durationSeconds: 45, notes: "Each side" }] },
  { slug: "recovery-stretch", title: "Post-Run Recovery Stretch", description: "Gentle stretching after a run or a hard training day.", category: "FLEXIBILITY", difficulty: "BEGINNER", durationMinutes: 15, equipmentSetting: "NONE", equipment: [],
    items: [{ exercise: "hip-flexor-stretch", sets: 2, durationSeconds: 45 }, { exercise: "hamstring-stretch", sets: 2, durationSeconds: 45 }, { exercise: "glute-bridge", sets: 2, reps: 10 }, { exercise: "cat-cow", sets: 1, reps: 10 }] },
  { slug: "runners-strength", title: "Runner's Strength Circuit", description: "Single-leg strength and hip stability to support your mileage and prevent injury.", category: "SPORT_SPECIFIC", specialization: "RUNNING", difficulty: "INTERMEDIATE", durationMinutes: 25, equipmentSetting: "HOME", equipment: [],
    items: [{ exercise: "single-leg-rdl", sets: 3, reps: 8, restSeconds: 45, notes: "Each leg" }, { exercise: "step-up", sets: 3, reps: 10, restSeconds: 45, notes: "Each leg" }, { exercise: "calf-raise", sets: 3, reps: 15, restSeconds: 30 }, { exercise: "side-plank", sets: 2, durationSeconds: 30, restSeconds: 30, notes: "Each side" }, { exercise: "glute-bridge", sets: 3, reps: 12, restSeconds: 30 }] },
  { slug: "swimmers-dryland", title: "Swimmer's Dryland Strength", description: "Shoulder stability, pulling strength and a strong core for a better stroke.", category: "SPORT_SPECIFIC", specialization: "SWIMMING", difficulty: "INTERMEDIATE", durationMinutes: 30, equipmentSetting: "HOME", equipment: ["dumbbells"],
    items: [{ exercise: "dumbbell-row", sets: 3, reps: 12, restSeconds: 60 }, { exercise: "overhead-press", sets: 3, reps: 10, restSeconds: 60 }, { exercise: "push-up", sets: 3, reps: 10, restSeconds: 60 }, { exercise: "dead-bug", sets: 3, reps: 10, restSeconds: 30 }, { exercise: "plank", sets: 3, durationSeconds: 40, restSeconds: 30 }] },
  { slug: "advanced-full-body", title: "Advanced Full-Body Strength", description: "Heavy compound lifts plus a conditioning finisher. For experienced lifters.", category: "STRENGTH", difficulty: "ADVANCED", durationMinutes: 50, equipmentSetting: "GYM", equipment: ["barbell", "dumbbells", "pull-up bar", "bench"],
    items: [{ exercise: "romanian-deadlift", sets: 5, reps: 5, restSeconds: 150 }, { exercise: "bulgarian-split-squat", sets: 4, reps: 8, restSeconds: 90 }, { exercise: "pull-up", sets: 4, reps: 8, restSeconds: 120 }, { exercise: "overhead-press", sets: 4, reps: 6, restSeconds: 120 }, { exercise: "burpee", sets: 3, reps: 10, restSeconds: 60, notes: "Finisher" }] },
  { slug: "cardio-ladder", title: "Bodyweight Cardio Ladder", description: "Reps go up every round. Tough, sweaty and equipment-free.", category: "CARDIO", difficulty: "ADVANCED", durationMinutes: 30, equipmentSetting: "NONE", equipment: [],
    items: [{ exercise: "burpee", sets: 5, reps: 10, restSeconds: 30 }, { exercise: "mountain-climber", sets: 5, reps: 30, restSeconds: 30 }, { exercise: "reverse-lunge", sets: 5, reps: 20, restSeconds: 30 }, { exercise: "jumping-jack", sets: 5, reps: 40, restSeconds: 30 }] },
];

export interface PlanItemSeed {
  exercise: string; // slug
  dayOfWeek: number; // 1 = Mon
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  targetPace?: string;
  notes?: string;
}

/** A 4-week 10K build with progressive long runs and intervals. */
export function runningPlanWeek(week: number): PlanItemSeed[] {
  const longRunKm = [8, 9, 10, 7][week - 1] ?? 8; // week 4 is a lighter recovery week
  const intervals = [6, 7, 8, 5][week - 1] ?? 6;
  return [
    { exercise: "easy-run", dayOfWeek: 1, distanceMeters: 5000, targetPace: "6:30/km", notes: "Keep it conversational." },
    { exercise: "single-leg-rdl", dayOfWeek: 2, sets: 3, reps: 8, notes: "Each leg." },
    { exercise: "goblet-squat", dayOfWeek: 2, sets: 3, reps: 10 },
    { exercise: "calf-raise", dayOfWeek: 2, sets: 3, reps: 15 },
    { exercise: "side-plank", dayOfWeek: 2, sets: 2, durationSeconds: 30, notes: "Each side." },
    { exercise: "interval-run", dayOfWeek: 4, sets: intervals, distanceMeters: 400, targetPace: "5:00/km", notes: "90 seconds easy jog between repeats." },
    { exercise: "long-run", dayOfWeek: 6, distanceMeters: longRunKm * 1000, targetPace: "6:45/km", notes: week === 4 ? "Recovery week: shorter and easy." : "Start slow, finish relaxed." },
    { exercise: "hip-flexor-stretch", dayOfWeek: 7, sets: 2, durationSeconds: 45 },
    { exercise: "hamstring-stretch", dayOfWeek: 7, sets: 2, durationSeconds: 45 },
  ];
}

/** A 4-week technique block for a swimmer, with dryland. */
export function swimmingPlanWeek(week: number): PlanItemSeed[] {
  const repeats = [6, 8, 10, 6][week - 1] ?? 6;
  return [
    { exercise: "freestyle-catch-up", dayOfWeek: 1, sets: 6, distanceMeters: 50, notes: "Focus on long, relaxed strokes." },
    { exercise: "kick-set", dayOfWeek: 1, sets: 4, distanceMeters: 50 },
    { exercise: "dumbbell-row", dayOfWeek: 3, sets: 3, reps: 12 },
    { exercise: "overhead-press", dayOfWeek: 3, sets: 3, reps: 10 },
    { exercise: "dead-bug", dayOfWeek: 3, sets: 3, reps: 10 },
    { exercise: "swim-intervals", dayOfWeek: 5, sets: repeats, distanceMeters: 100, targetPace: "1:55/100m", notes: "20 seconds rest between repeats." },
    { exercise: "pull-buoy-set", dayOfWeek: 6, sets: 4, distanceMeters: 100 },
  ];
}
