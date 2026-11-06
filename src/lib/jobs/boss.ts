import "server-only";

import PgBoss from "pg-boss";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { JOB_NAMES, type JobName, type JobPayloads } from "./queues";

/**
 * NOTIF-02 — pg-boss lifecycle.
 *
 * Two entry points:
 * - `getBoss()` is the producer used by request handlers. It runs without
 *   supervision/scheduling so the web process never competes with workers.
 * - `getWorkerBoss()` is used by `pnpm jobs:worker` and enables supervision.
 *
 * The singleton promise makes concurrent first calls safe and ensures the
 * queue schema is migrated exactly once per process.
 */

const QUEUE_DEFAULTS: Omit<PgBoss.Queue, "name"> = {
  retryLimit: 5,
  retryDelay: 60,
  retryBackoff: true,
  expireInSeconds: 10 * 60,
};

let producerPromise: Promise<PgBoss> | null = null;
let workerPromise: Promise<PgBoss> | null = null;

function attachLogging(boss: PgBoss): void {
  boss.on("error", (error) => {
    logger.error("jobs.boss_error", { error: error.message });
  });
}

async function createBoss(options: { worker: boolean }): Promise<PgBoss> {
  // The worker holds long-lived connections and runs maintenance, so prefer the
  // direct (non-pooled) Neon URL. The web producer uses the pooled URL.
  const connectionString = options.worker
    ? (env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL)
    : env.DATABASE_URL;

  const boss = new PgBoss({
    connectionString,
    schema: env.JOBS_SCHEMA,
    application_name: options.worker ? "ledgerflow-worker" : "ledgerflow-web",
    supervise: options.worker,
    schedule: options.worker,
    // Both processes may be the first to start in a fresh environment.
    migrate: true,
  });

  attachLogging(boss);
  await boss.start();

  await Promise.all(JOB_NAMES.map((name) => boss.createQueue(name, { ...QUEUE_DEFAULTS, name })));

  logger.info("jobs.started", { role: options.worker ? "worker" : "producer" });
  return boss;
}

export function getBoss(): Promise<PgBoss> {
  producerPromise ??= createBoss({ worker: false });
  return producerPromise;
}

export function getWorkerBoss(): Promise<PgBoss> {
  workerPromise ??= createBoss({ worker: true });
  return workerPromise;
}

export async function stopBoss(): Promise<void> {
  const pending = [producerPromise, workerPromise];
  producerPromise = null;
  workerPromise = null;

  await Promise.all(
    pending.map(async (promise) => {
      if (!promise) return;
      try {
        const boss = await promise;
        await boss.stop();
      } catch (error) {
        logger.error("jobs.stop_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );
}

/**
 * Enqueues a typed job. Returns the job id, or `null` when pg-boss deduplicated
 * the request (singleton keys).
 */
export async function enqueue<K extends JobName>(
  name: K,
  data: JobPayloads[K],
  options: PgBoss.SendOptions = {},
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(name, data, options);
}

/** Schedules a job for a future date (used by TASK-03 recurrence / NOTIF-03). */
export async function enqueueAt<K extends JobName>(
  name: K,
  data: JobPayloads[K],
  startAfter: Date | string | number,
  options: PgBoss.SendOptions = {},
): Promise<string | null> {
  const boss = await getBoss();
  return boss.sendAfter(name, data, options, startAfter as Date);
}
