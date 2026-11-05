import "server-only";

import { logger } from "@/lib/logger";
import {
  runTaskReminderSweep,
  sendTaskReminder,
} from "@/lib/notifications/reminders";

import type { JobName, JobPayloads } from "./queues";

/**
 * NOTIF-02 / NOTIF-03 — job dispatcher.
 *
 * Unexpected jobs fail loudly instead of being silently completed so queue
 * misconfiguration is visible in logs and retries/dead letters.
 */
export async function processJob<K extends JobName>(name: K, data: JobPayloads[K]): Promise<void> {
  switch (name) {
    case "notifications.reminder-sweep":
      await runTaskReminderSweep();
      return;
    case "notifications.email-reminder":
      await sendTaskReminder(data as JobPayloads["notifications.email-reminder"]);
      return;
    default:
      logger.error("jobs.unknown", { job: String(name) });
      throw new Error(`Unknown job "${String(name)}".`);
  }
}
