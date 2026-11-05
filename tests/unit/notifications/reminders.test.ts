import { describe, expect, it } from "vitest";

import { reminderDay, taskReminderKind } from "@/lib/notifications/reminder-policy";

/**
 * NOTIF-03 — reminder day bucket and due/overdue classification.
 *
 * Due dates are stored as UTC dates, so a task due today must never be
 * reported as overdue regardless of the time of day the sweep runs.
 */
describe("task reminders", () => {
  it("classifies a task due later today as due", () => {
    expect(taskReminderKind(new Date("2026-11-05T00:00:00.000Z"), new Date("2026-11-05T18:45:00.000Z"))).toBe(
      "TASK_DUE",
    );
  });

  it("classifies a task from a previous day as overdue", () => {
    expect(taskReminderKind(new Date("2026-11-04T00:00:00.000Z"), new Date("2026-11-05T06:00:00.000Z"))).toBe(
      "TASK_OVERDUE",
    );
  });

  it("classifies a future task as due rather than overdue", () => {
    expect(taskReminderKind(new Date("2026-11-06T00:00:00.000Z"), new Date("2026-11-05T06:00:00.000Z"))).toBe(
      "TASK_DUE",
    );
  });

  it("uses a stable UTC day key for de-duplication", () => {
    expect(reminderDay(new Date("2026-11-05T00:00:00.000Z"))).toBe("2026-11-05");
    expect(reminderDay(new Date("2026-11-05T23:59:59.999Z"))).toBe("2026-11-05");
  });
});
