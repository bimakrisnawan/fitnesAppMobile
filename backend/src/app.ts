import path from "node:path";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { usingMockMayar } from "./lib/mayar.js";
import { mockCheckoutRouter } from "./lib/mayar-mock.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { coachLibraryRouter } from "./modules/coach/coach-library.routes.js";
import { coachRouter } from "./modules/coach/coach.routes.js";
import { coachingRouter } from "./modules/coaching/coaching.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { workoutsRouter } from "./modules/workouts/workouts.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // Railway/Render terminate TLS at a proxy
  // Cross-origin resource policy relaxed so the web app (another origin) can load /media images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  // The mobile app sends no Origin header, so CORS only affects the coach web dashboard.
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Workout thumbnails and other local images: drop files in backend/public/media.
  app.use("/media", express.static(path.resolve("public/media"), { maxAge: "1h", fallthrough: false }));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.API_RATE_LIMIT_PER_MIN,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      // Mayar's webhook must never be throttled.
      skip: (req) => env.NODE_ENV === "test" || req.path === "/payments/mayar-callback",
    }),
  );
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/user", usersRouter); // spec alias: /api/user/completed-workouts
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/workouts", workoutsRouter);
  app.use("/api/coaching", coachingRouter);
  app.use("/api/coach", coachRouter);
  app.use("/api/coach", coachLibraryRouter);
  app.use("/api/notifications", notificationsRouter);

  if (usingMockMayar) app.use("/dev", mockCheckoutRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
