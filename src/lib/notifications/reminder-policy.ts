import type { NotificationType } from "@prisma/client";

export type TaskReminderKind = Extract<NotificationType, "TASK_DUE" | "TASK_OVERDUE">;

/** UTC calendar day used to de-duplicate reminders across restarts. */
export function reminderDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Due today → TASK_DUE; anything earlier → TASK_OVERDUE.
 *
 * Due dates are stored as dates (UTC midnight) so comparing UTC calendar days
 * avoids off-by-one errors around the workspace timezone.
 */
export function taskReminderKind(dueDate: Date, now: Date = new Date()): TaskReminderKind {
  const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return due < today ? "TASK_OVERDUE" : "TASK_DUE";
}
