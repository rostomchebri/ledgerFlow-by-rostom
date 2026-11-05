import "server-only";

import type { FirmRole } from "@prisma/client";

import { recordAudit } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { canAssignRole, outranks } from "@/lib/rbac";

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found.");
    this.name = "MemberNotFoundError";
  }
}

export class MemberManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberManagementError";
  }
}

async function getTarget(firmId: string, memberId: string) {
  const member = await db.firmMember.findFirst({
    where: { id: memberId, firmId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!member) throw new MemberNotFoundError();
  return member;
}

export async function changeMemberRole(input: {
  firmId: string;
  memberId: string;
  actorId: string;
  actorRole: FirmRole;
  role: FirmRole;
}) {
  const target = await getTarget(input.firmId, input.memberId);

  if (target.userId === input.actorId) {
    throw new MemberManagementError("You cannot change your own role.");
  }
  if (target.role === "OWNER") {
    throw new MemberManagementError("The workspace owner's role cannot be changed.");
  }
  if (!outranks(input.actorRole, target.role)) {
    throw new MemberManagementError("You cannot manage a member with the same or higher role.");
  }
  if (!canAssignRole(input.actorRole, input.role)) {
    throw new MemberManagementError("Your role cannot assign this role.");
  }
  if (target.role === input.role) return target;

  const updated = await db.firmMember.update({
    where: { id: target.id },
    data: { role: input.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await recordAudit({
    firmId: input.firmId,
    actorId: input.actorId,
    action: "member.role_changed",
    entityType: "firm_member",
    entityId: updated.id,
    metadata: { from: target.role, to: updated.role, member: updated.user.email },
  });

  await createNotification({
    firmId: input.firmId,
    userId: updated.userId,
    type: "SYSTEM",
    title: "Your role changed",
    body: `You are now ${updated.role.toLowerCase()} in this workspace.`,
    href: "/settings",
  });

  return updated;
}

export async function removeMember(input: {
  firmId: string;
  memberId: string;
  actorId: string;
  actorRole: FirmRole;
}) {
  const target = await getTarget(input.firmId, input.memberId);

  if (target.userId === input.actorId) {
    throw new MemberManagementError("You cannot remove yourself from the workspace.");
  }
  if (target.role === "OWNER") {
    throw new MemberManagementError("The workspace owner cannot be removed.");
  }
  if (!outranks(input.actorRole, target.role)) {
    throw new MemberManagementError("You cannot manage a member with the same or higher role.");
  }

  await db.firmMember.delete({ where: { id: target.id } });

  await recordAudit({
    firmId: input.firmId,
    actorId: input.actorId,
    action: "member.removed",
    entityType: "firm_member",
    entityId: target.id,
    metadata: { member: target.user.email, role: target.role },
  });

  return target;
}
