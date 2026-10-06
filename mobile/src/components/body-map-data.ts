// Muscle map geometry, shared (as a copy) with coach-web/src/lib/body-map-data.ts.
// viewBox "0 0 200 400". Shapes are drawn for one side of the body and mirrored across x = 100.
// Muscle ids must match backend/src/lib/muscles.ts.

export const MUSCLE_IDS = [
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

export type MuscleId = (typeof MUSCLE_IDS)[number];

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  traps: "Traps",
  lats: "Lats",
  "lower-back": "Lower back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

/** Body outline pieces (one side). */
export const SILHOUETTE = [
  "M100 56 C88 56 80 58 72 62 C60 66 54 74 52 86 L50 118 C50 140 56 160 62 176 C64 186 66 194 68 200 L100 204 Z",
  "M60 66 C50 68 44 78 43 92 L40 138 C40 146 44 150 50 150 C54 146 56 136 58 124 L62 92 Z",
  "M41 146 C38 160 34 178 32 196 C32 202 36 206 42 204 C46 196 50 176 54 150 Z",
  "M68 198 C62 226 62 254 66 282 C68 290 76 294 84 292 C92 290 96 280 97 268 C99 248 100 224 100 204 Z",
  "M68 290 C62 316 62 344 68 372 C70 378 78 380 82 376 C88 350 90 318 88 292 Z",
];

const ARM = "M60 100 C52 104 46 114 45 128 C45 138 49 144 54 142 C60 134 62 118 62 102 Z";
const FOREARM = "M44 152 C40 164 37 178 35 192 C37 198 42 198 45 194 C49 180 52 166 54 152 C50 149 47 149 44 152 Z";
const DELT = "M74 64 C62 64 54 70 52 82 C51 92 54 98 60 98 C62 86 66 76 78 70 Z";

export const FRONT: Partial<Record<MuscleId, string[]>> = {
  shoulders: [DELT],
  chest: ["M99 70 C92 68 82 68 76 72 C66 78 62 90 66 100 C72 108 88 108 99 102 Z"],
  biceps: [ARM],
  forearms: [FOREARM],
  abs: ["M99 108 C94 108 90 110 88 112 C87 128 87 150 89 172 C92 180 96 184 99 186 Z"],
  obliques: ["M86 112 C78 114 70 116 66 120 C64 136 66 156 72 170 C78 174 84 174 88 172 C86 152 85 130 86 112 Z"],
  quads: ["M72 208 C66 228 66 252 70 272 C74 282 82 284 88 280 C94 266 96 240 96 214 C90 206 80 204 72 208 Z"],
  calves: ["M70 302 C67 318 67 336 71 350 C74 354 78 352 79 346 C80 330 80 314 79 300 Z"],
};

export const BACK: Partial<Record<MuscleId, string[]>> = {
  traps: ["M100 50 C94 52 88 56 80 60 C74 63 72 66 74 70 C84 74 92 84 100 108 Z"],
  shoulders: [DELT],
  triceps: [ARM],
  forearms: [FOREARM],
  lats: ["M80 76 C72 80 66 86 64 96 C64 116 68 136 76 150 C84 152 90 146 94 136 C96 118 92 96 80 76 Z"],
  "lower-back": ["M99 136 C94 136 90 140 89 146 C88 160 90 172 94 182 L99 184 Z"],
  glutes: ["M99 188 C90 186 80 186 74 192 C68 200 68 214 74 222 C82 230 94 228 99 220 Z"],
  hamstrings: ["M74 228 C68 244 68 262 72 278 C76 286 84 286 88 280 C94 266 96 248 96 230 C88 232 80 232 74 228 Z"],
  calves: ["M70 296 C64 312 64 330 70 344 C74 350 80 350 84 344 C88 330 88 312 86 296 C80 292 74 292 70 296 Z"],
};
