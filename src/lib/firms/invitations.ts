import "server-only";

import { randomBytes } from "node:crypto";
import type { FirmMember, FirmRole, Invitation } from "@prisma/client";

import { sendInvitationEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { canAssignRole } from "@/lib/rbac";

const INVITATION_TTL_DAYS = 7;
const INVITATION_TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitation not found.");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super("This invitation has expired.");
    this.name = "InvitationExpiredError";
  }
}

export class InvitationUnavailableError extends Error {
  constructor() {
    super("This invitation is no longer available.");
    this.name = "InvitationUnavailableError";
  }
}

export class InvitationEmailMismatchError extends Error {
  constructor() {
    super("This invitation was sent to a different email address.");
    this.name = "InvitationEmailMismatchError";
  }
}

export class InvitationAlreadyPendingError extends Error {
  constructor() {
    super("An invitation is already pending for this email address.");
    this.name = "InvitationAlreadyPendingError";
  }
}

export class MemberAlreadyExistsError extends Error {
  constructor() {
    super("This person is already a member of the workspace.");
    this.name = "MemberAlreadyExistsError";
  }
}

export class RoleNotAssignableError extends Error {
  constructor() {
    super("Your role cannot assign this role.");
    this.name = "RoleNotAssignableError";
  }
}

export type InvitationWithFirm = Invitation & {
  firm: { id: string; name: string; slug: string };
  invitedBy: { name: string } | null;
};

/** FIRM-03 — sends an invitation and returns the created row. */
export async function createInvitation(input: {
  firmId: string;
  firmName: string;
  email: string;
  role: FirmRole;
  actorRole: FirmRole;
  invitedById: string;
  inviterName: string;
}): Promise<Invitation> {
  if (!canAssignRole(input.actorRole, input.role)) {
    throw new RoleNotAssignableError();
  }

  const email = input.email.trim().toLowerCase();

  const existingMember = await prisma.firmMember.findFirst({
    where: {
      firmId: input.firmId,
      user: { email: { equals: email, mode: "insensitive" } },
    },
    select: { id: true },
  });

  if (existingMember) throw new MemberAlreadyExistsError();

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      firmId: input.firmId,
      email: { equals: email, mode: "insensitive" },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingInvitation) {
    if (existingInvitation.expiresAt > new Date()) {
      throw new InvitationAlreadyPendingError();
    }

    await prisma.invitation.update({
      where: { id: existingInvitation.id },
      data: { status: "EXPIRED" },
    });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const invitation = await prisma.invitation.create({
    data: {
      firmId: input.firmId,
      email,
      role: input.role,
      token,
      expiresAt,
      invitedById: input.invitedById,
    },
  });

  await sendInvitationEmail({
    to: email,
    firmName: input.firmName,
    inviterName: input.inviterName,
    role: input.role,
    url: `${env.NEXT_PUBLIC_APP_URL}/invitations/${token}`,
  });

  return invitation;
}

export async function getInvitationByToken(token: string): Promise<InvitationWithFirm | null> {
  return prisma.invitation.findUnique({
    where: { token },
    include: {
      firm: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true } },
    },
  });
}

/**
 * Accepting an invitation is guarded by the signed-in user's verified email:
 * a valid token alone never grants access to somebody else's mailbox.
 */
export async function acceptInvitation(
  token: string,
  user: { id: string; email: string },
): Promise<FirmMember> {
  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation) throw new InvitationNotFoundError();

  if (invitation.status !== "PENDING") {
    throw new InvitationUnavailableError();
  }

  if (invitation.expiresAt <= new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new InvitationExpiredError();
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new InvitationEmailMismatchError();
  }

  return prisma.$transaction(async (tx) => {
    // Upsert keeps acceptance idempotent when two invitations for the same
    // firm are accepted concurrently; an existing membership keeps its role.
    const membership = await tx.firmMember.upsert({
      where: { firmId_userId: { firmId: invitation.firmId, userId: user.id } },
      update: {},
      create: {
        firmId: invitation.firmId,
        userId: user.id,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedById: user.id },
    });

    return membership;
  });
}

export async function listFirmMembers(firmId: string) {
  return prisma.firmMember.findMany({
    where: { firmId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPendingInvitations(firmId: string) {
  return prisma.invitation.findMany({
    where: { firmId, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvitation(firmId: string, invitationId: string): Promise<void> {
  const result = await prisma.invitation.updateMany({
    where: { id: invitationId, firmId, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  if (result.count === 0) throw new InvitationNotFoundError();
}
