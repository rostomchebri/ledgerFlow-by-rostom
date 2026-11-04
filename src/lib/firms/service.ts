import "server-only";

import type { Firm, FirmMember, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { slugifyFirmName, suffixedSlug } from "./slug";

export class FirmAlreadyJoinedError extends Error {
  constructor() {
    super("This account already belongs to a workspace.");
    this.name = "FirmAlreadyJoinedError";
  }
}

export class FirmSlugConflictError extends Error {
  constructor() {
    super("Could not allocate a unique workspace slug.");
    this.name = "FirmSlugConflictError";
  }
}

const MAX_SLUG_ATTEMPTS = 50;

async function allocateSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
  const base = slugifyFirmName(name);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? base : suffixedSlug(base, attempt + 1);
    const existing = await tx.firm.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }

  throw new FirmSlugConflictError();
}

export type CreatedFirm = {
  firm: Firm;
  membership: FirmMember;
};

/**
 * FIRM-01 — creates a workspace and makes the creator its OWNER in one
 * transaction. The membership is what `getFirmContext()` resolves afterwards.
 */
export async function createFirmForUser(userId: string, name: string): Promise<CreatedFirm> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.firmMember.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (existing) throw new FirmAlreadyJoinedError();

    const slug = await allocateSlug(tx, name);

    const firm = await tx.firm.create({
      data: { name, slug },
    });

    const membership = await tx.firmMember.create({
      data: { firmId: firm.id, userId, role: "OWNER" },
    });

    return { firm, membership };
  });
}
