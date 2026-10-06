import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startScheduler } from "./jobs/scheduler.js";
import { prisma } from "./lib/prisma.js";

const server = createApp().listen(env.PORT, () => {
  console.info(`API listening on http://localhost:${env.PORT}`);
});
const stopScheduler = startScheduler();

function shutdown(signal: string) {
  console.info(`${signal} received, shutting down`);
  stopScheduler();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
