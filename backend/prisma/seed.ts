// Development seed. Safe to re-run:
//  - Catalog (exercises, workouts) is upserted by slug, so coach-made content is kept.
//  - Videos/images come from prisma/demo-media.json; empty values leave existing media untouched.
//  - Demo accounts (listed in DEMO below) are deleted and recreated with fresh, date-relative history.
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import type { Prisma } from "../src/generated/prisma/client.js";
import type { Specialization } from "../src/generated/prisma/enums.js";
import { localDayKey, startOfLocalWeek } from "../src/lib/dates.js";
import { prisma } from "../src/lib/prisma.js";
import { extractYoutubeId } from "../src/lib/youtube.js";
import { addBillingPeriod } from "../src/modules/subscriptions/pricing.js";
import { EXERCISES, type PlanItemSeed, runningPlanWeek, WORKOUTS } from "./seed-data.js";

const DAY = 24 * 60 * 60 * 1000;
const PASSWORDS = { coach: "coach-password-123", client: "client-password-123" };

interface MediaFile {
  exercises: Record<string, { youtube?: string }>;
  workouts: Record<string, { youtube?: string; thumbnail?: string }>;
}

function loadMedia(): MediaFile {
  try {
    return JSON.parse(readFileSync(new URL("./demo-media.json", import.meta.url), "utf8"));
  } catch {
    return { exercises: {}, workouts: {} };
  }
}

function youtubeFrom(value: string | undefined, label: string) {
  if (!value?.trim()) return undefined;
  const id = extractYoutubeId(value);
  if (!id) console.warn(`  ! ${label}: "${value}" is not a YouTube link, skipped`);
  return id ?? undefined;
}

const thumbnailFrom = (value: string | undefined) =>
  !value?.trim() ? undefined : /^https?:\/\//.test(value.trim()) ? value.trim() : `/media/${value.trim().replace(/^\/?(media\/)?/, "")}`;

// ─── Catalog ──────────────────────────────────────────────────────────────────

async function seedCatalog(media: MediaFile) {
  const exerciseIds = new Map<string, string>();
  for (const e of EXERCISES) {
    // Adopt rows from the first version of the seed, which had no slugs.
    await prisma.exercise.updateMany({ where: { slug: null, name: e.name }, data: { slug: e.slug } });
    const youtubeVideoId = youtubeFrom(media.exercises[e.slug]?.youtube, e.slug);
    const data = {
      name: e.name,
      description: e.description,
      equipment: e.equipment,
      primaryMuscles: e.primary,
      secondaryMuscles: e.secondary,
      alternatives: e.alternatives as unknown as Prisma.InputJsonValue,
      ...(youtubeVideoId && { youtubeVideoId }),
    };
    const row = await prisma.exercise.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data });
    exerciseIds.set(e.slug, row.id);
  }

  for (const w of WORKOUTS) {
    await prisma.workout.updateMany({ where: { slug: null, title: w.title }, data: { slug: w.slug } });
    const m = media.workouts[w.slug] ?? {};
    const youtubeVideoId = youtubeFrom(m.youtube, w.slug);
    const thumbnailUrl = thumbnailFrom(m.thumbnail);
    const data = {
      title: w.title,
      description: w.description,
      category: w.category,
      specialization: w.specialization ?? null,
      difficulty: w.difficulty,
      durationMinutes: w.durationMinutes,
      equipmentSetting: w.equipmentSetting,
      equipment: w.equipment,
      isPublished: true,
      ...(youtubeVideoId && { youtubeVideoId }),
      ...(thumbnailUrl && { thumbnailUrl }),
    };
    const workout = await prisma.workout.upsert({ where: { slug: w.slug }, create: { slug: w.slug, ...data }, update: data });
    await prisma.workoutExercise.deleteMany({ where: { workoutId: workout.id } });
    await prisma.workoutExercise.createMany({
      data: w.items.map((item, i) => ({
        workoutId: workout.id,
        exerciseId: exerciseIds.get(item.exercise)!,
        position: i + 1,
        sets: item.sets,
        reps: item.reps,
        durationSeconds: item.durationSeconds,
        restSeconds: item.restSeconds,
        notes: item.notes,
      })),
    });
  }
  const [withVideo, withThumb] = await Promise.all([
    prisma.exercise.count({ where: { youtubeVideoId: { not: null } } }),
    prisma.workout.count({ where: { thumbnailUrl: { not: null } } }),
  ]);
  console.info(`Catalog: ${EXERCISES.length} exercises (${withVideo} with video), ${WORKOUTS.length} workouts (${withThumb} with image).`);
  return exerciseIds;
}

// ─── Demo accounts ────────────────────────────────────────────────────────────

const DEMO = {
  coachGeneral: { email: "coach@example.com", fullName: "Coach Rina", specialization: "GENERAL" as Specialization, bio: "Strength & conditioning coach. 8 years helping busy people get strong at home or in the gym.", years: 8 },
  coachRun: { email: "coach.run@example.com", fullName: "Coach Bayu", specialization: "RUNNING" as Specialization, bio: "Marathoner and running coach. From first 5K to sub-4 marathon.", years: 6 },
  coachSwim: { email: "coach.swim@example.com", fullName: "Coach Sari", specialization: "SWIMMING" as Specialization, bio: "Former competitive swimmer. Technique first, then speed.", years: 10 },
  client: { email: "client@example.com", fullName: "Demo Client" },
  member: { email: "member@example.com", fullName: "Maya Lestari" },
  runner: { email: "runner@example.com", fullName: "Raka Pratama" },
  swimmer: { email: "swimmer@example.com", fullName: "Sinta Dewi" },
};
const DEMO_EMAILS = Object.values(DEMO).map((d) => d.email);

async function removeDemoAccounts() {
  const users = await prisma.user.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  const payments = await prisma.payment.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
  await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
  await prisma.coachingSession.deleteMany({ where: { OR: [{ coachId: { in: ids } }, { clientId: { in: ids } }] } });
  await prisma.coachingPlan.deleteMany({ where: { OR: [{ coachId: { in: ids } }, { clientId: { in: ids } }] } });
  await prisma.subscription.updateMany({ where: { coachId: { in: ids } }, data: { coachId: null } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

/** A Jakarta wall-clock time `days` from today, as a UTC instant. */
function atLocal(days: number, hour: number, minute = 0) {
  const [y, m, d] = localDayKey(new Date()).split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days, hour - 7, minute));
}

async function createSubscription(
  userId: string,
  tier: "MONTHLY" | "COACHING",
  startedDaysAgo: number,
  extra: Partial<Prisma.SubscriptionUncheckedCreateInput> = {},
) {
  const start = atLocal(-startedDaysAgo, 9, 12);
  const end = addBillingPeriod(start);
  const sub = await prisma.subscription.create({
    data: { userId, tier, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, ...extra },
  });
  await prisma.payment.create({
    data: {
      userId,
      subscriptionId: sub.id,
      orderId: `DEMO-${tier[0]}-${userId.slice(0, 8).toUpperCase()}`,
      tier,
      amount: tier === "MONTHLY" ? 79_000 : 499_000,
      status: "SETTLED",
      paidAt: start,
      periodStart: start,
      periodEnd: end,
      expiresAt: new Date(start.getTime() + 60 * 60_000),
    },
  });
  await prisma.notification.create({
    data: {
      userId,
      type: "PAYMENT_SUCCESS",
      title: "Payment received",
      body: `${tier === "MONTHLY" ? "Monthly Membership" : "1-on-1 Coaching"} is active.`,
      createdAt: start,
      readAt: start,
    },
  });
  return sub;
}

async function createPlan(opts: {
  clientId: string;
  coachId: string;
  specialization: Specialization;
  title: string;
  description: string;
  weeks: number;
  week: (n: number) => PlanItemSeed[];
}) {
  // Started Monday of last week, so "today" falls in week 2 with week 1 already logged.
  const startDate = new Date(`${localDayKey(new Date(startOfLocalWeek().getTime() - 7 * DAY))}T00:00:00Z`);
  const plan = await prisma.coachingPlan.create({
    data: {
      clientId: opts.clientId,
      coachId: opts.coachId,
      specialization: opts.specialization,
      title: opts.title,
      description: opts.description,
      status: "ACTIVE",
      startDate,
      endDate: new Date(startDate.getTime() + (opts.weeks * 7 - 1) * DAY),
    },
  });
  const bySlug = new Map((await prisma.exercise.findMany({ where: { slug: { not: null } } })).map((c) => [c.slug!, c]));
  const todayStart = atLocal(0, 0);

  for (let week = 1; week <= opts.weeks; week++) {
    const positions = new Map<number, number>();
    for (const item of opts.week(week)) {
      const c = bySlug.get(item.exercise)!;
      const position = (positions.get(item.dayOfWeek) ?? 0) + 1;
      positions.set(item.dayOfWeek, position);
      const created = await prisma.planExercise.create({
        data: {
          planId: plan.id,
          exerciseId: c.id,
          name: c.name,
          youtubeVideoId: c.youtubeVideoId,
          equipment: c.equipment,
          primaryMuscles: c.primaryMuscles,
          secondaryMuscles: c.secondaryMuscles,
          alternatives: c.alternatives as Prisma.InputJsonValue,
          weekNumber: week,
          dayOfWeek: item.dayOfWeek,
          position,
          sets: item.sets,
          reps: item.reps,
          durationSeconds: item.durationSeconds,
          distanceMeters: item.distanceMeters,
          targetPace: item.targetPace,
          notes: item.notes,
        },
      });

      // Log everything scheduled before today at 06:30 Jakarta time, skipping one item so progress looks real.
      const day = (week - 1) * 7 + item.dayOfWeek - 1;
      const when = new Date(startDate.getTime() + day * DAY - 30 * 60_000);
      if (when >= todayStart || (week === 1 && item.exercise === "calf-raise")) continue;
      const totalMeters = item.distanceMeters ? item.distanceMeters * (item.sets ?? 1) : undefined;
      await prisma.exerciseLog.create({
        data: {
          userId: opts.clientId,
          planExerciseId: created.id,
          completedAt: when,
          setsCompleted: item.sets,
          repsCompleted: item.reps,
          weightKg: item.exercise === "goblet-squat" ? 12 : undefined,
          // Runs logged at ~6:30/km.
          durationSeconds: totalMeters && item.targetPace?.endsWith("/km") ? Math.round(totalMeters * 0.39) : item.durationSeconds,
          distanceMeters: totalMeters,
          notes: item.exercise === "long-run" ? "Felt strong, legs a bit heavy in the last km." : undefined,
        },
      });
    }
  }
  return plan;
}

async function seedDemoAccounts() {
  await removeDemoAccounts();
  const [coachHash, clientHash] = await Promise.all([bcrypt.hash(PASSWORDS.coach, 12), bcrypt.hash(PASSWORDS.client, 12)]);

  const coaches = {} as Record<"coachGeneral" | "coachRun" | "coachSwim", { id: string }>;
  for (const key of ["coachGeneral", "coachRun", "coachSwim"] as const) {
    const c = DEMO[key];
    coaches[key] = await prisma.user.create({
      data: {
        email: c.email,
        fullName: c.fullName,
        role: "COACH",
        passwordHash: coachHash,
        coachProfile: { create: { specialization: c.specialization, bio: c.bio, experienceYears: c.years } },
      },
    });
  }

  const client = (d: { email: string; fullName: string }, extra: Partial<Prisma.UserCreateInput> = {}) =>
    prisma.user.create({ data: { email: d.email, fullName: d.fullName, passwordHash: clientHash, ...extra } });

  // 1. Fresh account with no plan: for trying checkout.
  await client(DEMO.client);

  // 2. Monthly member with a week and a half of training history.
  const member = await client(DEMO.member, {
    fitnessLevel: "BEGINNER",
    goals: "Get stronger at home, 3 workouts a week.",
    preferredSpecialization: "GENERAL",
    birthYear: 1996,
  });
  await createSubscription(member.id, "MONTHLY", 12);
  const workouts = await prisma.workout.findMany({ where: { slug: { not: null } } });
  const history: [number, string][] = [
    [11, "full-body-basics"], [9, "morning-mobility"], [7, "full-body-basics"], [5, "core-stability"],
    [3, "no-equipment-hiit"], [2, "morning-mobility"], [1, "full-body-basics"],
  ];
  for (const [daysAgo, slug] of history) {
    const w = workouts.find((x) => x.slug === slug);
    if (w) {
      await prisma.workoutCompletion.create({
        data: { userId: member.id, workoutId: w.id, completedAt: atLocal(-daysAgo, 6, 30), notes: daysAgo === 1 ? "Added 2 kg to squats!" : undefined },
      });
    }
  }

  // 3. Runner with a coach, an active plan, logs and sessions.
  const runner = await client(DEMO.runner, {
    fitnessLevel: "INTERMEDIATE",
    goals: "Run my first 10K under 60 minutes.",
    preferredSpecialization: "RUNNING",
    birthYear: 1993,
  });
  await createSubscription(runner.id, "COACHING", 9, { specialization: "RUNNING", coachId: coaches.coachRun.id });
  const plan = await createPlan({
    clientId: runner.id,
    coachId: coaches.coachRun.id,
    specialization: "RUNNING",
    title: "10K Build: Block 1",
    description: "Four weeks to build your aerobic base and speed. Easy runs stay easy; intervals are where we push. Week 4 is a lighter recovery week.",
    weeks: 4,
    week: runningPlanWeek,
  });
  await prisma.coachingSession.createMany({
    data: [
      { planId: plan.id, coachId: coaches.coachRun.id, clientId: runner.id, type: "ONLINE", startsAt: atLocal(-6, 19), meetUrl: "https://meet.google.com/abc-defg-hij", status: "COMPLETED", reminderSentAt: atLocal(-7, 19), notes: "Kick-off: goals, running history, plan walkthrough." },
      { planId: plan.id, coachId: coaches.coachRun.id, clientId: runner.id, type: "ONLINE", startsAt: atLocal(1, 19), meetUrl: "https://meet.google.com/abc-defg-hij", notes: "Weekly check-in: review interval splits and how the long run felt." },
      { planId: plan.id, coachId: coaches.coachRun.id, clientId: runner.id, type: "OFFLINE", startsAt: atLocal(5, 6), durationMinutes: 60, location: "GBK Senayan running track, Gate 5", notes: "Running form session + 400 m repeats together." },
    ],
  });
  const runnerNotes: [string, "NEW_PLAN" | "SESSION_SCHEDULED", string, number][] = [
    ["You've been matched with a coach", "NEW_PLAN", "Coach Bayu is your coach and is preparing your plan.", 9],
    ["Your training plan is ready", "NEW_PLAN", 'Coach Bayu published "10K Build: Block 1". Open Coaching to see this week.', 8],
    ["In-person session scheduled", "SESSION_SCHEDULED", "Coach Bayu: GBK Senayan running track, Gate 5. Check Coaching for the time.", 0],
  ];
  for (const [title, type, body, daysAgo] of runnerNotes) {
    await prisma.notification.create({
      data: { userId: runner.id, type, title, body, createdAt: atLocal(-daysAgo, 8), readAt: daysAgo > 0 ? atLocal(-daysAgo, 9) : null },
    });
  }

  // 4. Swimmer who just paid and is waiting for a coach: claim her from the coach dashboard.
  const swimmer = await client(DEMO.swimmer, {
    fitnessLevel: "INTERMEDIATE",
    goals: "Swim 1.5 km non-stop for my first triathlon.",
    preferredSpecialization: "SWIMMING",
    birthYear: 1998,
  });
  await createSubscription(swimmer.id, "COACHING", 1, { specialization: "SWIMMING" });

  console.info("Demo accounts (clients: client-password-123, coaches: coach-password-123):");
  for (const d of Object.values(DEMO)) console.info(`  ${d.email.padEnd(24)} ${d.fullName}`);
}

async function main() {
  await seedCatalog(loadMedia());
  await seedDemoAccounts();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
