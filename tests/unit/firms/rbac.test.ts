import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  assertPermission,
  can,
  canAssignRole,
  outranks,
  PermissionDeniedError,
} from "@/lib/rbac";

describe("role permission matrix", () => {
  it("gives the owner every permission", () => {
    for (const permission of [
      "firm.manage",
      "member.invite",
      "member.manage",
      "client.read",
      "client.write",
      "client.archive",
      "document.write",
      "invoice.write",
      "task.write",
      "audit.read",
    ] as const) {
      expect(can("OWNER", permission)).toBe(true);
    }
  });

  it("lets admins run the firm but not change firm-level settings", () => {
    expect(can("ADMIN", "member.invite")).toBe(true);
    expect(can("ADMIN", "client.write")).toBe(true);
    expect(can("ADMIN", "firm.manage")).toBe(false);
  });

  it("lets accountants work on clients and documents but not manage the team", () => {
    expect(can("ACCOUNTANT", "client.write")).toBe(true);
    expect(can("ACCOUNTANT", "document.write")).toBe(true);
    expect(can("ACCOUNTANT", "member.invite")).toBe(false);
    expect(can("ACCOUNTANT", "firm.manage")).toBe(false);
  });

  it("keeps viewers read-only", () => {
    expect(can("VIEWER", "client.read")).toBe(true);
    expect(can("VIEWER", "audit.read")).toBe(true);
    expect(can("VIEWER", "client.write")).toBe(false);
    expect(can("VIEWER", "client.archive")).toBe(false);
  });

  it("throws a typed error when a permission is missing", () => {
    expect(() => assertPermission("VIEWER", "client.write")).toThrow(PermissionDeniedError);
    expect(() => assertPermission("OWNER", "client.write")).not.toThrow();
  });
});

describe("role assignment", () => {
  it("only lets the owner hand out admin rights", () => {
    expect(canAssignRole("OWNER", "ADMIN")).toBe(true);
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false);
    expect(assignableRoles("ADMIN")).toEqual(["ACCOUNTANT", "VIEWER"]);
  });

  it("lets admins invite accountants and viewers but nothing higher", () => {
    expect(canAssignRole("ADMIN", "ACCOUNTANT")).toBe(true);
    expect(canAssignRole("ADMIN", "VIEWER")).toBe(true);
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false);
    expect(assignableRoles("ACCOUNTANT")).toEqual([]);
    expect(assignableRoles("VIEWER")).toEqual([]);
  });

  it("never grants ownership through an invitation", () => {
    expect(assignableRoles("OWNER")).not.toContain("OWNER");
  });

  it("uses rank to protect higher roles from lower ones", () => {
    expect(outranks("OWNER", "ADMIN")).toBe(true);
    expect(outranks("ADMIN", "ACCOUNTANT")).toBe(true);
    expect(outranks("ACCOUNTANT", "ADMIN")).toBe(false);
    expect(outranks("ADMIN", "OWNER")).toBe(false);
  });
});
