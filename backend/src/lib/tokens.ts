import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/enums.js";

export interface AccessTokenClaims {
  userId: string;
  role: Role;
}

const ROLES: readonly Role[] = ["CLIENT", "COACH", "ADMIN"];

export function signAccessToken({ userId, role }: AccessTokenClaims): string {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    algorithm: "HS256",
  });
}

/** Throws if the token is invalid or expired. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub || !ROLES.includes(payload.role)) {
    throw new Error("Malformed access token");
  }
  return { userId: payload.sub, role: payload.role };
}

/** Random, URL-safe token for refresh and password-reset flows. Only its hash is stored. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
