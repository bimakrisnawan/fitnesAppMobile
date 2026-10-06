import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const { userId } = currentUser(req);
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  res.json({ notifications, unreadCount });
});

notificationsRouter.post("/read-all", async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: currentUser(req).userId, readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  await prisma.notification.updateMany({ where: { id, userId: currentUser(req).userId, readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});
