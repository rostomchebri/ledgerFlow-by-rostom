/**
 * FIRM-05 — tenant isolation primitives.
 *
 * Every firm-scoped row carries `firmId`. Services must always combine the
 * resource id with the firm id resolved from the session (never from request
 * input). These helpers make the rule explicit and testable, and give future
 * modules a single place to enforce it.
 */

export type TenantContext = { firmId: string };
export type TenantScoped = { firmId: string };

export class TenantIsolationError extends Error {
  constructor(message = "Resource does not belong to the current firm.") {
    super(message);
    this.name = "TenantIsolationError";
  }
}

/** Non-throwing predicate used by filters and tests. */
export function isSameTenant(
  context: TenantContext,
  resource: TenantScoped | null | undefined,
): boolean {
  return Boolean(resource && resource.firmId === context.firmId);
}

/**
 * Throws when a resource is missing or belongs to another firm. Callers that
 * face untrusted input should map this to a 404 so cross-tenant existence is
 * not revealed.
 */
export function assertSameTenant(
  context: TenantContext,
  resource: TenantScoped | null | undefined,
): asserts resource is TenantScoped {
  if (!isSameTenant(context, resource)) {
    throw new TenantIsolationError();
  }
}

/**
 * Adds (and overwrites) `firmId` on a Prisma `where` clause. Overwriting is
 * deliberate: a caller can never widen the scope by passing a different firm.
 */
export function firmScopedWhere<T extends Record<string, unknown>>(
  firmId: string,
  where: T = {} as T,
): T & { firmId: string } {
  return { ...where, firmId };
}
