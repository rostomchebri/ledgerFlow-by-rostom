/**
 * Temporary firm context.
 *
 * AUTH-03 (sessions) and FIRM-01 (workspace onboarding) are not implemented yet,
 * so the client module resolves a single demo workspace from the environment.
 * Every client query is still scoped by `firmId` so the switch to a real session
 * only has to replace this file — no query changes required (FIRM-05).
 */
export const DEMO_FIRM = {
  id: "demo-firm",
  name: "Cabinet Demo",
  slug: "cabinet-demo",
} as const;

export type FirmContext = {
  firmId: string;
  firmName: string;
  /** Null until AUTH-03 provides a session user. */
  userId: string | null;
};

export function getFirmContext(): FirmContext {
  return {
    firmId: process.env.DEMO_FIRM_ID?.trim() || DEMO_FIRM.id,
    firmName: DEMO_FIRM.name,
    userId: null,
  };
}
