// Integration tests: need the database from `npm run db:dev` with migrations applied.
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const app = createApp();
const email = `test-${Date.now()}@example.com`;
const password = "correct-horse-battery";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("auth flow", () => {
  let accessToken: string;
  let refreshToken: string;

  it("registers a new client", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: email.toUpperCase(), password, fullName: "Test User" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, role: "CLIENT" });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects a duplicate email", async () => {
    const res = await request(app).post("/api/auth/register").send({ email, password, fullName: "Again" });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("logs in and reads the profile", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password });
    expect(login.status).toBe(200);
    ({ accessToken, refreshToken } = login.body.tokens);

    const profile = await request(app).get("/api/users/profile").set("Authorization", `Bearer ${accessToken}`);
    expect(profile.status).toBe(200);
    expect(profile.body.user.email).toBe(email);
  });

  it("reports no entitlements without a subscription", async () => {
    const res = await request(app).get("/api/users/subscription-status").set("Authorization", `Bearer ${accessToken}`);
    expect(res.body.entitlements).toMatchObject({ library: false, coaching: false });
  });

  it("rejects requests without a token", async () => {
    expect((await request(app).get("/api/users/profile")).status).toBe(401);
  });

  it("rotates refresh tokens and revokes everything on reuse", async () => {
    const first = await request(app).post("/api/auth/refresh-token").send({ refreshToken });
    expect(first.status).toBe(200);
    const rotated = first.body.tokens.refreshToken;
    expect(rotated).not.toBe(refreshToken);

    // Replaying the old token signals theft: it fails and kills the rotated token too.
    const replay = await request(app).post("/api/auth/refresh-token").send({ refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("REFRESH_REUSED");

    const afterReuse = await request(app).post("/api/auth/refresh-token").send({ refreshToken: rotated });
    expect(afterReuse.status).toBe(401);
  });

  it("validates input", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });
});
