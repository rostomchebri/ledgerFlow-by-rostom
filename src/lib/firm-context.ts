import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import type { FirmRole } from "@/lib/rbac";
import { getSession } from "@/lib/session";

/**
 * FIRM-01 / FIRM-05 — tenant context resolved from the authenticated user's
 * membership, never from request input. Every firm-scoped query must use the
 * `firmId` returned here.
 *
 * A user may belong to several firms. The MVP picks the oldest membership;
 * a workspace switcher can later store the active firm in a cookie without
 * touching the query layer.
 */
export type FirmContext = {
  firmId: string;
  firmName: string;
  firmSlug: string;
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: FirmRole;
};

export const getFirmContext = cache(async (): Promise<FirmContext | null> => {
  const session = await getSession();
  if (!session) return null;

  const membership = await prisma.firmMember.findFirst({
    where: { userId: session.user.id },
    include: { firm: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return null;

  return {
    firmId: membership.firmId,
    firmName: membership.firm.name,
    firmSlug: membership.firm.slug,
    memberId: membership.id,
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    role: membership.role,
  };
});

/**
 * Server component / layout guard. Users without a workspace are sent to
 * onboarding instead of seeing an empty app shell.
 */
export async function requireFirmContext(): Promise<FirmContext> {
  const context = await getFirmContext();

  if (!context) {
    redirect("/onboarding");
  }

  return context;
}

/**
 * Route-handler guard. Never redirects; API clients receive a JSON error that
 * distinguishes "not signed in" (401) from "no workspace" (403).
 */
export async function requireApiFirmContext(): Promise<FirmContext> {
  const session = await getSession();

  if (!session) {
    throw new ApiError("UNAUTHORIZED", "Authentication required.");
  }

  const context = await getFirmContext();

  if (!context) {
    throw new ApiError("FORBIDDEN", "No firm workspace is associated with this account.");
  }

  return context;
}
