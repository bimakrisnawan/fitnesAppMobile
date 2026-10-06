import type { Prisma } from "../../generated/prisma/client.js";
import type { NotificationType } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * In-app notification. Push delivery (Expo/FCM) will hook in here once a Firebase project exists;
 * PushToken rows are already stored by POST /api/users/push-token.
 */
export function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Prisma.InputJsonValue,
  db: Db = prisma,
) {
  return db.notification.create({ data: { userId, type, title, body, data } });
}
