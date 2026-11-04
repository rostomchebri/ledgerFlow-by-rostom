/**
 * NOTIF-02 — background worker process.
 *
 * Start with `pnpm jobs:worker` (or as a separate process/container in
 * production). The web app only enqueues jobs; this process owns supervision,
 * scheduling and job execution.
 */
import { getWorkerBoss } from "../src/lib/jobs/boss";
import { processJob } from "../src/lib/jobs/processor";
import { JOB_NAMES } from "../src/lib/jobs/queues";
import { logger } from "../src/lib/logger";

async function main() {
  const boss = await getWorkerBoss();

  for (const name of JOB_NAMES) {
    await boss.work(name, { batchSize: 1 }, async (jobs) => {
      for (const job of jobs) {
        logger.info("jobs.processing", { job: name, id: job.id });
        await processJob(name, job.data as never);
        logger.info("jobs.completed", { job: name, id: job.id });
      }
    });
  }

  logger.info("jobs.worker_ready", { queues: JOB_NAMES });

  let stopping = false;

  async function shutdown(signal: string) {
    if (stopping) return;
    stopping = true;
    logger.info("jobs.shutdown", { signal });

    try {
      await boss.stop({ graceful: true, timeout: 30_000 });
      process.exit(0);
    } catch (error) {
      logger.error("jobs.shutdown_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main().catch((error) => {
  logger.error("jobs.worker_failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
