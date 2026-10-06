import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schemas.js";
import * as auth from "./auth.service.js";

// 5 attempts per 15 minutes (spec). Keyed by IP *and* email: Indonesian mobile carriers put many
// users behind one IP (CGNAT), so an IP-only key would lock out strangers sharing that address.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip ?? "")}|${email}`;
  },
  skip: () => env.NODE_ENV === "test",
});

export const authRouter = Router();

authRouter.post("/register", credentialLimiter, async (req, res) => {
  const result = await auth.register(registerSchema.parse(req.body));
  res.status(201).json(result);
});

authRouter.post("/login", credentialLimiter, async (req, res) => {
  res.json(await auth.login(loginSchema.parse(req.body)));
});

authRouter.post("/refresh-token", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  res.json({ tokens: await auth.refresh(refreshToken) });
});

authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await auth.logout(refreshToken);
  res.status(204).end();
});

authRouter.post("/password-reset/request", credentialLimiter, async (req, res) => {
  const { email } = passwordResetRequestSchema.parse(req.body);
  await auth.requestPasswordReset(email);
  res.status(204).end();
});

authRouter.post("/password-reset/confirm", credentialLimiter, async (req, res) => {
  const { token, password } = passwordResetConfirmSchema.parse(req.body);
  await auth.resetPassword(token, password);
  res.status(204).end();
});
