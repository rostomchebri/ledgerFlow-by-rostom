import "server-only";

import { db } from "@/lib/db";
import { sendTaskReminderEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { enqueue } from "@/lib/jobs/boss";
import { logger } from "@/lib/logger";
import { findDueTasks } from "@/lib/tasks/service";

import { reminderDay, taskReminderKind } from "./reminder-policy";
import { notifyTask } from "./service";

export { reminderDay, taskReminderKind, type TaskReminderKind } from "./reminder-policy";

export type ReminderSweepResult = {
  tasks: number;
  notifications: number;
  emails: number;
};

/**
 * NOTIF-03 — daily sweep.
 *
 * Creates one in-app notification per assignee/task/day and enqueues one
 * e-mail reminder job per task. Both writes are idempotent for the day, so the
 * sweep can be re-run safely after an incident.
 */
export async function runTaskReminderSweep(now: Date = new Date()): Promise<ReminderSweepResult> {
  const tasks = await findDueTasks(now);
  const day = reminderDay(now);
  let notifications = 0;
  let emails = 0;

  for (const task of tasks) {
    if (!task.assignee || !task.dueDate) continue;

    const kind = taskReminderKind(task.dueDate, now);
    const title = kind === "TASK_OVERDUE" ? "Task is overdue" : "Task is due today";

    await notifyTask({
      firmId: task.firmId,
      userId: task.assignee.id,
      type: kind,
      title,
      body: task.title,
      href: `/tasks/${task.id}`,
      taskId: task.id,
      day,
    });
    notifications += 1;

    await enqueue(
      "notifications.email-reminder",
      { taskId: task.id, firmId: task.firmId },
      {
        singletonKey: `notifications.email-reminder:${task.id}:${day}`,
        singletonSeconds: 24 * 60 * 60,
        retryLimit: 3,
      },
    );
    emails += 1;
  }

  logger.info("notifications.reminder_sweep", {
    dueTasks: tasks.length,
    notifications,
    emails,
  });

  return { tasks: tasks.length, notifications, emails };
}

/**
 * NOTIF-03 — e-mail handler.
 *
 * The task is re-read before sending so a task completed or reassigned after
 * the sweep does not trigger a stale reminder.
 */
export async function sendTaskReminder(payload: {
  taskId: string;
  firmId: string;
}): Promise<void> {
  const task = await db.task.findFirst({
    where: { id: payload.taskId, firmId: payload.firmId },
    include: {
      firm: { select: { name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      client: { select: { name: true } },
    },
  });

  if (!task || !task.assignee || !task.dueDate) {
    logger.info("notifications.reminder_skipped", {
      taskId: payload.taskId,
      reason: !task ? "missing" : !task.assignee ? "unassigned" : "no_due_date",
    });
    return;
  }

  if (task.status !== "TODO" && task.status !== "IN_PROGRESS") {
    logger.info("notifications.reminder_skipped", {
      taskId: payload.taskId,
      reason: "not_open",
      status: task.status,
    });
    return;
  }

  const kind = taskReminderKind(task.dueDate);

  await sendTaskReminderEmail({
    to: task.assignee.email,
    name: task.assignee.name,
    taskTitle: task.title,
    firmName: task.firm.name,
    clientName: task.client?.name,
    dueDate: task.dueDate,
    overdue: kind === "TASK_OVERDUE",
    url: `${env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}`,
  });
}
