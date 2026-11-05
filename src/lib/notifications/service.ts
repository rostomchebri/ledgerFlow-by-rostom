import "server-only";

import type { NotificationType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type CreateNotificationInput = {
  firmId: string;
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  href?: string | null;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await db.notification.create({
    data: {
      firmId: input.firmId,
      userId: input.userId,
      type: input.type ?? "SYSTEM",
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });
}

export async function unreadNotificationCount(firmId: string, userId: string): Promise<number> {
  return db.notification.count({ where: { firmId, userId, readAt: null } });
}

export async function listNotifications(
  firmId: string,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
) {
  const where: Prisma.NotificationWhereInput = {
    firmId,
    userId,
    ...(options.unreadOnly ? { readAt: null } : {}),
  };

  return db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
  });
}

export async function markNotificationRead(
  firmId: string,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const result = await db.notification.updateMany({
    where: { id: notificationId, firmId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

export async function markAllNotificationsRead(firmId: string, userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { firmId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

/** Creates a single notification per user/task/type combination per day. */
export async function notifyTask(
  input: CreateNotificationInput & { taskId: string; day: string },
): Promise<void> {
  const href = input.href ?? `/tasks/${input.taskId}`;
  const existing = await db.notification.findFirst({
    where: {
      firmId: input.firmId,
      userId: input.userId,
      href,
      createdAt: { gte: new Date(`${input.day}T00:00:00.000Z`) },
    },
    select: { id: true },
  });

  if (existing) return;

  await createNotification({ ...input, href });
}
