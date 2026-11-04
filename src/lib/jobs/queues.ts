/**
 * NOTIF-02 — queue catalogue.
 *
 * Queue names are part of the database contract: never rename an existing
 * queue without a migration plan, because pg-boss stores the name on every
 * job. Add new queues to both `JOB_NAMES` and `JOB_PAYLOADS`.
 */
export const JOB_NAMES = ["notifications.email-reminder"] as const;

export type JobName = (typeof JOB_NAMES)[number];

/** Payloads are plain JSON-serialisable objects. */
export type JobPayloads = {
  "notifications.email-reminder": {
    taskId: string;
    firmId: string;
  };
};

export function isJobName(value: string): value is JobName {
  return (JOB_NAMES as readonly string[]).includes(value);
}
