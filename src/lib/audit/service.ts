import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AuditAction =
  | "client.created"
  | "client.updated"
  | "client.archived"
  | "client.restored"
  | "client.assigned"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.status_changed"
  | "invoice.deleted"
  | "document.uploaded"
  | "document.deleted"
  | "document.restored"
  | "task.created"
  | "task.updated"
  | "task.status_changed"
  | "task.deleted"
  | "task.comment_added"
  | "member.invited"
  | "member.invitation_revoked"
  | "member.role_changed"
  | "member.removed"
  | "member.joined"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "report.exported";

export type AuditInput = {
  firmId: string;
  actorId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * AUDIT-01 — append-only activity log.
 *
 * Audit writes are best-effort so a logging failure can never roll back the
 * business action. The error is still visible in structured logs.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        firmId: input.firmId,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    logger.error("audit.write_failed", {
      action: input.action,
      entityType: input.entityType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export type AuditListQuery = {
  q: string;
  action: string;
  entityType: string;
  page: number;
  pageSize: number;
};

export function parseAuditListQuery(
  params: Record<string, string | string[] | undefined>,
): AuditListQuery {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const pageSize = Number.parseInt(first(params.pageSize) ?? "25", 10);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    action: (first(params.action) ?? "").trim().slice(0, 80),
    entityType: (first(params.entityType) ?? "").trim().slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: [10, 25, 50].includes(pageSize) ? pageSize : 25,
  };
}

export async function listAuditLogs(firmId: string, query: AuditListQuery) {
  const where: Prisma.AuditLogWhereInput = {
    firmId,
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: "insensitive" } },
            { entityType: { contains: query.q, mode: "insensitive" } },
            { entityId: { contains: query.q, mode: "insensitive" } },
            { actor: { name: { contains: query.q, mode: "insensitive" } } },
            { actor: { email: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
