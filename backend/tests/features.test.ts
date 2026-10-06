// Workout library, coaching (client + coach), notifications, stats and scheduled jobs. Real database.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { runJobsOnce } from "../src/jobs/scheduler.js";
import { prisma } from "../src/lib/prisma.js";
import { addBillingPeriod } from "../src/modules/subscriptions/pricing.js";

const app = createApp();
const tag = `feat-${Date.now()}`;
const emails = { visitor: `${tag}-visitor@example.com`, member: `${tag}-member@example.com`, client: `${tag}-client@example.com`, coach: `${tag}-coach@example.com`, otherCoach: `${tag}-coach2@example.com` };
const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
let workoutId: string;
let exerciseId: string;

const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

async function register(who: keyof typeof emails) {
  const res = await request(app).post("/api/auth/register").send({ email: emails[who], password: "a-good-password", fullName: who });
  ids[who] = res.body.user.id;
  tokens[who] = res.body.tokens.accessToken;
}

async function makeCoach(who: "coach" | "otherCoach") {
  await prisma.user.update({ where: { id: ids[who] }, data: { role: "COACH", coachProfile: { create: { specialization: "RUNNING" } } } });
  // Role is in the access token, so log in again.
  const res = await request(app).post("/api/auth/login").send({ email: emails[who], password: "a-good-password" });
  tokens[who] = res.body.tokens.accessToken;
}

async function activate(userId: string, tier: "MONTHLY" | "COACHING") {
  const now = new Date();
  await prisma.subscription.create({
    data: { userId, tier, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: addBillingPeriod(now), specialization: tier === "COACHING" ? "RUNNING" : null },
  });
}

beforeAll(async () => {
  for (const who of Object.keys(emails) as (keyof typeof emails)[]) await register(who);
  await makeCoach("coach");
  await makeCoach("otherCoach");
  await activate(ids.member!, "MONTHLY");
  await activate(ids.client!, "COACHING");

  const exercise = await prisma.exercise.create({
    data: { name: `${tag} Squat`, equipment: ["dumbbell"], youtubeVideoId: "dQw4w9WgXcQ", alternatives: [{ setting: "home", replace: "dumbbell", with: "backpack" }] },
  });
  exerciseId = exercise.id;
  const workout = await prisma.workout.create({
    data: {
      title: `${tag} Leg Day`,
      description: "Test workout",
      category: "STRENGTH",
      difficulty: "BEGINNER",
      durationMinutes: 20,
      equipmentSetting: "HOME",
      equipment: ["dumbbell"],
      youtubeVideoId: "dQw4w9WgXcQ",
      isPublished: true,
      exercises: { create: [{ exerciseId, position: 1, sets: 3, reps: 10 }] },
    },
  });
  workoutId = workout.id;
});

afterAll(async () => {
  const userIds = Object.values(ids);
  await prisma.coachingSession.deleteMany({ where: { OR: [{ coachId: { in: userIds } }, { clientId: { in: userIds } }] } });
  await prisma.coachingPlan.deleteMany({ where: { OR: [{ coachId: { in: userIds } }, { clientId: { in: userIds } }] } });
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.workout.deleteMany({ where: { id: workoutId } });
  await prisma.exercise.deleteMany({ where: { id: exerciseId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("workout library", () => {
  it("lets any signed-in user browse and filter", async () => {
    const res = await request(app).get("/api/workouts").query({ q: tag, equipment: "HOME", category: "STRENGTH" }).set(as("visitor"));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ title: `${tag} Leg Day`, hasVideo: true, exerciseCount: 1 });
    expect(res.body.items[0].youtubeVideoId).toBeUndefined();

    const none = await request(app).get("/api/workouts").query({ q: tag, equipment: "GYM" }).set(as("visitor"));
    expect(none.body.total).toBe(0);
  });

  it("supports the spec's search and category aliases", async () => {
    const search = await request(app).get("/api/workouts/search").query({ query: tag }).set(as("visitor"));
    expect(search.body.total).toBe(1);
    const category = await request(app).get("/api/workouts/category/strength").query({ q: tag }).set(as("visitor"));
    expect(category.body.total).toBe(1);
  });

  it("hides videos from non-members but shows them to members", async () => {
    const locked = await request(app).get(`/api/workouts/${workoutId}`).set(as("visitor"));
    expect(locked.body.workout).toMatchObject({ locked: true, youtubeVideoId: null, hasVideo: true });
    expect(locked.body.workout.exercises[0].exercise.youtubeVideoId).toBeNull();

    const open = await request(app).get(`/api/workouts/${workoutId}`).set(as("member"));
    expect(open.body.workout).toMatchObject({ locked: false, youtubeVideoId: "dQw4w9WgXcQ" });
    expect(open.body.workout.exercises[0].exercise.alternatives[0].with).toBe("backpack");
  });

  it("only lets members log a workout, and tracks history and stats", async () => {
    expect((await request(app).post(`/api/workouts/${workoutId}/complete`).set(as("visitor"))).status).toBe(403);

    const done = await request(app).post(`/api/workouts/${workoutId}/complete`).set(as("member")).send({ notes: "Felt good" });
    expect(done.status).toBe(201);

    const history = await request(app).get("/api/user/completed-workouts").set(as("member"));
    expect(history.body.items[0]).toMatchObject({ notes: "Felt good", workout: { title: `${tag} Leg Day` } });

    const stats = await request(app).get("/api/users/stats").set(as("member"));
    expect(stats.body.stats).toMatchObject({ workoutsThisWeek: 1, totalWorkouts: 1, streakDays: 1 });

    // The test workout's exercise has no muscles yet, so nothing is counted; tagging comes later in this file.
    const heat = await request(app).get("/api/users/muscle-activity").set(as("member"));
    expect(heat.body).toMatchObject({ days: 7, sessions: 1 });
  });
});

describe("coaching", () => {
  let planId: string;
  let planExerciseId: string;

  it("is closed to users without a coaching plan", async () => {
    expect((await request(app).get("/api/coaching/my-plan").set(as("member"))).status).toBe(403);
    expect((await request(app).get("/api/coach/clients").set(as("member"))).status).toBe(403);
  });

  it("shows a waiting state before a coach is assigned", async () => {
    const res = await request(app).get("/api/coaching/my-plan").set(as("client"));
    expect(res.body).toMatchObject({ plan: null, coach: null, specialization: "RUNNING" });
  });

  it("lets a coach claim an unassigned client exactly once", async () => {
    const list = await request(app).get("/api/coach/clients/unassigned").set(as("coach"));
    expect(list.body.clients.some((c: { client: { id: string } }) => c.client.id === ids.client)).toBe(true);

    expect((await request(app).post(`/api/coach/clients/${ids.client}/claim`).set(as("coach"))).status).toBe(204);
    expect((await request(app).post(`/api/coach/clients/${ids.client}/claim`).set(as("otherCoach"))).status).toBe(409);

    const mine = await request(app).get("/api/coach/clients").set(as("coach"));
    expect(mine.body.clients.map((c: { client: { id: string } }) => c.client.id)).toContain(ids.client);
  });

  it("keeps other coaches out of the client's data", async () => {
    expect((await request(app).get(`/api/coach/clients/${ids.client}`).set(as("otherCoach"))).status).toBe(403);
    const plan = await request(app).post("/api/coach/plans").set(as("otherCoach")).send({ clientId: ids.client, title: "x", specialization: "RUNNING", startDate: "2026-10-05" });
    expect(plan.status).toBe(403);
  });

  it("builds a plan from the catalog and publishes it", async () => {
    const created = await request(app)
      .post("/api/coach/plans")
      .set(as("coach"))
      .send({ clientId: ids.client, title: "Base Block", specialization: "RUNNING", startDate: new Date().toISOString().slice(0, 10) });
    expect(created.status).toBe(201);
    planId = created.body.plan.id;
    expect(created.body.plan.status).toBe("DRAFT");

    expect((await request(app).post(`/api/coach/plans/${planId}/publish`).set(as("coach"))).status).toBe(400); // empty plan

    const item = await request(app).post(`/api/coach/plans/${planId}/exercises`).set(as("coach")).send({ exerciseId, weekNumber: 1, dayOfWeek: 2, sets: 3, reps: 12 });
    expect(item.status).toBe(201);
    expect(item.body.exercise).toMatchObject({ name: `${tag} Squat`, youtubeVideoId: "dQw4w9WgXcQ", equipment: ["dumbbell"], position: 1 });
    planExerciseId = item.body.exercise.id;

    const custom = await request(app)
      .post(`/api/coach/plans/${planId}/exercises`)
      .set(as("coach"))
      .send({ name: "Tempo run", weekNumber: 1, dayOfWeek: 4, distanceMeters: 5000, targetPace: "5:45/km", youtube: "https://youtu.be/dQw4w9WgXcQ" });
    expect(custom.body.exercise).toMatchObject({ exerciseId: null, youtubeVideoId: "dQw4w9WgXcQ" });

    const copied = await request(app).post(`/api/coach/plans/${planId}/copy-week`).set(as("coach")).send({ from: 1, to: 2 });
    expect(copied.body.plan.totalWeeks).toBe(2);
    expect(copied.body.plan.exercises).toHaveLength(4);

    const published = await request(app).post(`/api/coach/plans/${planId}/publish`).set(as("coach"));
    expect(published.body.plan.status).toBe("ACTIVE");
  });

  it("shows the client their plan and lets them log progress", async () => {
    const res = await request(app).get("/api/coaching/my-plan").set(as("client"));
    expect(res.body.plan).toMatchObject({ title: "Base Block", totalWeeks: 2, currentWeek: 1, progress: { completed: 0, total: 4 } });
    expect(res.body.coach.id).toBe(ids.coach);

    const log = await request(app).post(`/api/coaching/my-plan/exercises/${planExerciseId}/log`).set(as("client")).send({ setsCompleted: 3, repsCompleted: 12, weightKg: 14.5 });
    expect(log.status).toBe(201);
    expect(log.body.log.weightKg).toBe(14.5);

    const after = await request(app).get("/api/coaching/my-plan").set(as("client"));
    expect(after.body.plan.progress.completed).toBe(1);

    const detail = await request(app).get(`/api/coach/clients/${ids.client}`).set(as("coach"));
    expect(detail.body.logs[0]).toMatchObject({ weightKg: 14.5, exercise: { name: `${tag} Squat` } });

    // Another user can't log against this plan.
    expect((await request(app).post(`/api/coaching/my-plan/exercises/${planExerciseId}/log`).set(as("member")).send({})).status).toBe(403);
  });

  it("schedules sessions, notifies the client and sends one reminder", async () => {
    const noLink = await request(app).post("/api/coach/sessions/schedule").set(as("coach")).send({ clientId: ids.client, type: "ONLINE", startsAt: new Date(Date.now() + 3 * 3600_000).toISOString() });
    expect(noLink.status).toBe(400);

    const startsAt = new Date(Date.now() + 3 * 3600_000).toISOString();
    const session = await request(app)
      .post("/api/coach/sessions/schedule")
      .set(as("coach"))
      .send({ clientId: ids.client, planId, type: "ONLINE", startsAt, meetUrl: "https://meet.google.com/abc-defg-hij" });
    expect(session.status).toBe(201);
    expect(session.body.session).toMatchObject({ durationMinutes: 45, joinable: false });

    const upcoming = await request(app).get("/api/coaching/sessions").set(as("client"));
    expect(upcoming.body.sessions[0].meetUrl).toBe("https://meet.google.com/abc-defg-hij");

    await runJobsOnce();
    await runJobsOnce();
    const inbox = await request(app).get("/api/notifications").set(as("client"));
    const types = inbox.body.notifications.map((n: { type: string }) => n.type);
    expect(types.filter((t: string) => t === "SESSION_REMINDER")).toHaveLength(1);
    expect(types).toContain("SESSION_SCHEDULED");
    expect(types).toContain("NEW_PLAN");
    expect(inbox.body.unreadCount).toBeGreaterThan(0);

    await request(app).post("/api/notifications/read-all").set(as("client"));
    expect((await request(app).get("/api/notifications").set(as("client"))).body.unreadCount).toBe(0);

    const stats = await request(app).get("/api/users/stats").set(as("client"));
    expect(stats.body.nextSession.id).toBe(session.body.session.id);
  });

  it("lets the coach update the YouTube link of a catalog exercise", async () => {
    const bad = await request(app).put(`/api/coach/exercises/${exerciseId}`).set(as("coach")).send({ youtube: "https://example.com/video" });
    expect(bad.status).toBe(400);
    const ok = await request(app).put(`/api/coach/exercises/${exerciseId}`).set(as("coach")).send({ youtube: "https://www.youtube.com/shorts/dQw4w9WgXcQ" });
    expect(ok.body.exercise.youtubeVideoId).toBe("dQw4w9WgXcQ");
    // Fields not sent are left alone.
    expect(ok.body.exercise.equipment).toEqual(["dumbbell"]);
    expect(ok.body.exercise.alternatives).toHaveLength(1);
  });

  it("lets the coach tag muscles, which flow into plans and the library", async () => {
    const bad = await request(app).put(`/api/coach/exercises/${exerciseId}`).set(as("coach")).send({ primaryMuscles: ["wings"] });
    expect(bad.status).toBe(400);

    const tagged = await request(app)
      .put(`/api/coach/exercises/${exerciseId}`)
      .set(as("coach"))
      .send({ primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings"] });
    expect(tagged.body.exercise).toMatchObject({ primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings"], equipment: ["dumbbell"] });

    const item = await request(app).post(`/api/coach/plans/${planId}/exercises`).set(as("coach")).send({ exerciseId, weekNumber: 3, dayOfWeek: 1, sets: 3, reps: 8 });
    expect(item.body.exercise.primaryMuscles).toEqual(["quads", "glutes"]);

    const detail = await request(app).get(`/api/workouts/${workoutId}`).set(as("member"));
    expect(detail.body.workout.muscles).toEqual({ primary: ["quads", "glutes"], secondary: ["hamstrings"] });
    expect(detail.body.workout.exercises[0].exercise.primaryMuscles).toEqual(["quads", "glutes"]);

    // Muscle activity now reflects the member's completed workout (quads/glutes primary, hamstrings secondary).
    const heat = await request(app).get("/api/users/muscle-activity").query({ days: 30 }).set(as("member"));
    expect(heat.body.counts).toMatchObject({ quads: 1, glutes: 1, hamstrings: 0.5 });

    const byMuscle = await request(app).get("/api/workouts").query({ q: tag, muscle: "glutes" }).set(as("member"));
    expect(byMuscle.body.total).toBe(1);
    const none = await request(app).get("/api/workouts").query({ q: tag, muscle: "biceps" }).set(as("member"));
    expect(none.body.total).toBe(0);
  });
});

describe("coach: training plans list and workout library", () => {
  it("lists the coach's plans across clients, but not to other coaches", async () => {
    const mine = await request(app).get("/api/coach/plans").set(as("coach"));
    expect(mine.status).toBe(200);
    const plan = mine.body.plans.find((p: { client: { id: string } }) => p.client.id === ids.client);
    expect(plan).toMatchObject({ status: "ACTIVE", title: "Base Block" });
    expect(plan.progress.total).toBeGreaterThan(0);

    const other = await request(app).get("/api/coach/plans").set(as("otherCoach"));
    expect(other.body.plans.some((p: { client: { id: string } }) => p.client.id === ids.client)).toBe(false);
    expect((await request(app).get("/api/coach/plans").set(as("member"))).status).toBe(403);
  });

  it("creates a draft library workout, fills it, publishes it, and members see it", async () => {
    const created = await request(app)
      .post("/api/coach/workouts")
      .set(as("coach"))
      .send({ title: `${tag} Legs Express`, category: "STRENGTH", difficulty: "BEGINNER", durationMinutes: 15, equipmentSetting: "HOME" });
    expect(created.status).toBe(201);
    const id = created.body.workout.id;
    expect(created.body.workout.isPublished).toBe(false);

    // Drafts are invisible to members, and can't be published while empty.
    expect((await request(app).get("/api/workouts").query({ q: `${tag} Legs` }).set(as("member"))).body.total).toBe(0);
    expect((await request(app).put(`/api/coach/workouts/${id}`).set(as("coach")).send({ isPublished: true })).status).toBe(400);

    const filled = await request(app)
      .put(`/api/coach/workouts/${id}/exercises`)
      .set(as("coach"))
      .send({ items: [{ exerciseId, sets: 3, reps: 12, restSeconds: 60 }] });
    expect(filled.body.workout.exercises).toHaveLength(1);
    expect(filled.body.workout.muscles.primary).toEqual(["quads", "glutes"]);

    const published = await request(app).put(`/api/coach/workouts/${id}`).set(as("coach")).send({ isPublished: true, youtube: "https://youtu.be/dQw4w9WgXcQ" });
    expect(published.body.workout).toMatchObject({ isPublished: true, youtubeVideoId: "dQw4w9WgXcQ", title: `${tag} Legs Express` });

    const seen = await request(app).get("/api/workouts").query({ q: `${tag} Legs` }).set(as("member"));
    expect(seen.body.total).toBe(1);

    // Once someone has done it, delete only unpublishes (their history stays).
    await request(app).post(`/api/workouts/${id}/complete`).set(as("member"));
    const del = await request(app).delete(`/api/coach/workouts/${id}`).set(as("coach"));
    expect(del.body).toMatchObject({ deleted: false, unpublished: true });
    expect((await request(app).get("/api/workouts").query({ q: `${tag} Legs` }).set(as("member"))).body.total).toBe(0);

    await prisma.workout.delete({ where: { id } });
  });

  it("rejects bad input and is closed to clients", async () => {
    expect((await request(app).post("/api/coach/workouts").set(as("member")).send({})).status).toBe(403);
    const bad = await request(app).post("/api/coach/workouts").set(as("coach")).send({ title: "x", category: "YOGA", difficulty: "BEGINNER", durationMinutes: 10, equipmentSetting: "HOME" });
    expect(bad.status).toBe(400);
    const badThumb = await request(app)
      .put(`/api/coach/workouts/${workoutId}`)
      .set(as("coach"))
      .send({ thumbnailUrl: "javascript:alert(1)" });
    expect(badThumb.status).toBe(400);
  });
});
