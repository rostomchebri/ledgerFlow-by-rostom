import "server-only";

import { logger } from "@/lib/logger";

import type { JobName, JobPayloads } from "./queues";

/**
 * NOTIF-02 — job dispatcher.
 *
 * NOTIF-03 adds the e-mail reminder handler here. Until then, unexpected jobs
 * fail loudly instead of being silently completed.
 */
export async function processJob<K extends JobName>(name: K, _data: JobPayloads[K]): Promise<void> {
  switch (name) {
    case "notifications.email-reminder":
      logger.warn("jobs.handler_missing", { job: name });
      throw new Error(`No handler registered for job "${name}".`);
    default:
      throw new Error(`Unknown job "${String(name)}".`);
  }
}
