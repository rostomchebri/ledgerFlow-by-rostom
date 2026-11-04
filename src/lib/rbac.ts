/**
 * FIRM-02 — role-based access control policy.
 *
 * This module is intentionally pure (no database, no `server-only`) so the
 * exact same matrix can be imported by server handlers, server components,
 * and unit tests. The UI uses it to hide controls; the API always enforces it
 * again server-side.
 */

export const FIRM_ROLES = ["OWNER", "ADMIN", "ACCOUNTANT", "VIEWER"] as const;
export type FirmRole = (typeof FIRM_ROLES)[number];

export const PERMISSIONS = [
  "firm.manage",
  "member.invite",
  "member.manage",
  "client.read",
  "client.write",
  "client.archive",
  "document.read",
  "document.write",
  "invoice.read",
  "invoice.write",
  "task.read",
  "task.write",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ACCOUNTING_PERMISSIONS: readonly Permission[] = [
  "client.read",
  "client.write",
  "client.archive",
  "document.read",
  "document.write",
  "invoice.read",
  "invoice.write",
  "task.read",
  "task.write",
];

const READ_ONLY_PERMISSIONS: readonly Permission[] = [
  "client.read",
  "document.read",
  "invoice.read",
  "task.read",
  "audit.read",
];

/**
 * OWNER manages the workspace itself; ADMIN runs day-to-day operations
 * (including invitations) but cannot change firm-level settings.
 */
export const ROLE_PERMISSIONS: Record<FirmRole, readonly Permission[]> = {
  OWNER: [...PERMISSIONS],
  ADMIN: PERMISSIONS.filter((permission) => permission !== "firm.manage"),
  ACCOUNTANT: ACCOUNTING_PERMISSIONS,
  VIEWER: READ_ONLY_PERMISSIONS,
};

export function can(role: FirmRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAll(role: FirmRole, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

export class PermissionDeniedError extends Error {
  readonly permission: Permission;
  readonly role: FirmRole;

  constructor(role: FirmRole, permission: Permission) {
    super(`Role ${role} is not allowed to perform ${permission}.`);
    this.name = "PermissionDeniedError";
    this.role = role;
    this.permission = permission;
  }
}

/** Throws when the role lacks the permission. Callers map it to HTTP 403. */
export function assertPermission(role: FirmRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new PermissionDeniedError(role, permission);
  }
}

/**
 * Roles an actor may hand out. Nobody can grant OWNER through an invitation;
 * ownership transfer is intentionally out of scope for the MVP. Admins can
 * invite accountants and viewers, but only the owner can create another admin.
 */
export function assignableRoles(actorRole: FirmRole): readonly FirmRole[] {
  switch (actorRole) {
    case "OWNER":
      return ["ADMIN", "ACCOUNTANT", "VIEWER"];
    case "ADMIN":
      return ["ACCOUNTANT", "VIEWER"];
    case "ACCOUNTANT":
    case "VIEWER":
    default:
      return [];
  }
}

export function canAssignRole(actorRole: FirmRole, targetRole: FirmRole): boolean {
  return assignableRoles(actorRole).includes(targetRole);
}

/** Higher number = more authority. Used for member management guards. */
export const ROLE_RANK: Record<FirmRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  ACCOUNTANT: 2,
  VIEWER: 1,
};

/** True when `actor` outranks `target` and may therefore manage them. */
export function outranks(actorRole: FirmRole, targetRole: FirmRole): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}
