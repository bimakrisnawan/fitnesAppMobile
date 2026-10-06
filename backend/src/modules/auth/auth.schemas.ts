import { z } from "zod";

const email = z.email().trim().toLowerCase();
const password = z.string().min(8, "Password must be at least 8 characters").max(128);

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({ email });

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password,
});
