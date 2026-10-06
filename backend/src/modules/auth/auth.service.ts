import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import type { User } from "../../generated/prisma/client.js";
import { badRequest, conflict, unauthorized } from "../../lib/http-error.js";
import { sendMail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { generateOpaqueToken, hashToken, signAccessToken } from "../../lib/tokens.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// Compared against when the email is unknown, so login timing doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

export type PublicUser = Omit<User, "passwordHash" | "phoneEncrypted"> & { hasPhone: boolean };

export function toPublicUser({ passwordHash: _, phoneEncrypted, ...user }: User): PublicUser {
  return { ...user, hasPhone: phoneEncrypted !== null };
}

async function issueTokens(user: Pick<User, "id" | "role">): Promise<AuthTokens> {
  const refreshToken = generateOpaqueToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return {
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
    accessTokenExpiresIn: env.JWT_ACCESS_TTL_SECONDS,
    refreshToken,
  };
}

export async function register(input: { email: string; password: string; fullName: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("An account with this email already exists", "EMAIL_TAKEN");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    },
  });
  return { user: toPublicUser(user), tokens: await issueTokens(user) };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw unauthorized("Incorrect email or password", "BAD_CREDENTIALS");
  return { user: toPublicUser(user), tokens: await issueTokens(user) };
}

/**
 * Rotates a refresh token. Presenting an already-revoked token means it leaked or was replayed,
 * so every session for that user is revoked.
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!stored || stored.expiresAt <= new Date()) throw unauthorized("Invalid refresh token", "REFRESH_INVALID");

  // Atomic claim: only one concurrent request can rotate a given token.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0) {
    await revokeAllSessions(stored.userId);
    throw unauthorized("Refresh token reuse detected", "REFRESH_REUSED");
  }
  return issueTokens(stored.user);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Resolves the same way whether or not the email exists, to avoid account enumeration. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });
  await sendMail({
    to: user.email,
    subject: "Reset your password",
    text: `Open this link on your phone to choose a new password (valid for 1 hour):\n${env.APP_RESET_PASSWORD_URL}?token=${token}`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
    throw badRequest("This reset link is invalid or has expired", "RESET_INVALID");
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = new Date();
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: now } }),
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: now } }),
  ]);
}
