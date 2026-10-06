import type { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/enums.js";
import { forbidden, unauthorized } from "../lib/http-error.js";
import { type AccessTokenClaims, verifyAccessToken } from "../lib/tokens.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized("Missing bearer token");
  try {
    req.auth = verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    throw unauthorized("Invalid or expired token", "TOKEN_INVALID");
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };
}

/** For handlers mounted behind requireAuth. */
export function currentUser(req: Request): AccessTokenClaims {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
