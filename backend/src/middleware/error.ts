import type { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod";
import { HttpError } from "../lib/http-error.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: "Route not found" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: "Validation failed", code: "VALIDATION", details: z.flattenError(err) } });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }
  // body-parser errors (malformed JSON, payload too large) carry a status
  if (err instanceof Error && "status" in err && typeof err.status === "number" && err.status < 500) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
