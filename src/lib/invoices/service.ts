import "server-only";

import type { InvoiceStatus, Prisma } from "@prisma/client";

import { recordAudit } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";

import {
  calculateTotals,
  parseInvoiceListFilters,
  type InvoiceInput,
  type InvoiceUpdateInput,
} from "./schema";

export const INVOICE_PAGE_SIZE = 12;

export type InvoiceStatusSummary = {
  status: InvoiceStatus;
  count: number;
  amount: number;
};

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found.");
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceReferenceError";
  }
}

export class InvoiceConflictError extends Error {
  constructor(message = "This invoice number is already used.") {
    super(message);
    this.name = "InvoiceConflictError";
  }
}

export class InvoiceStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceStatusError";
  }
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

export function parseInvoiceQuery(
  params: Record<string, string | string[] | undefined>,
) {
  return parseInvoiceListFilters(params);
}

export type InvoiceListQuery = ReturnType<typeof parseInvoiceQuery>;

function invoiceWhere(
  firmId: string,
  query: InvoiceListQuery,
): Prisma.InvoiceWhereInput {
  return {
    firmId,
    ...(query.status !== "ALL" ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.from || query.to
      ? {
          issueDate: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            { client: { name: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listInvoices(firmId: string, query: InvoiceListQuery) {
  const where = invoiceWhere(firmId, query);

  const [items, total, grouped] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * INVOICE_PAGE_SIZE,
      take: INVOICE_PAGE_SIZE,
    }),
    db.invoice.count({ where }),
    db.invoice.groupBy({
      by: ["status"],
      where: { firmId },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  const statuses: InvoiceStatusSummary[] = (["DRAFT", "SENT", "PAID", "OVERDUE"] as const).map((status) => {
    const row = grouped.find((entry) => entry.status === status);
    return {
      status,
      count: row?._count._all ?? 0,
      amount: toNumber(row?._sum.total),
    };
  });

  return {
    items,
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / INVOICE_PAGE_SIZE)),
    statuses,
  };
}

export async function getInvoice(firmId: string, invoiceId: string) {
  return db.invoice.findFirst({
    where: { id: invoiceId, firmId },
    include: {
      client: { select: { id: true, name: true, email: true, taxId: true } },
      lineItems: { orderBy: { position: "asc" } },
    },
  });
}

async function assertClient(firmId: string, clientId: string) {
  const client = await db.client.findFirst({
    where: { id: clientId, firmId },
    select: { id: true },
  });
  if (!client) throw new InvoiceReferenceError("The selected client does not belong to this firm.");
}

async function assertNumberAvailable(
  firmId: string,
  number: string,
  ignoreId?: string,
) {
  const existing = await db.invoice.findFirst({
    where: {
      firmId,
      number: { equals: number, mode: "insensitive" },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new InvoiceConflictError();
}

async function assertNotDuplicate(
  firmId: string,
  input: { clientId: string; issueDate: Date; total: number; currency: string },
  ignoreId?: string,
) {
  const duplicate = await db.invoice.findFirst({
    where: {
      firmId,
      clientId: input.clientId,
      issueDate: input.issueDate,
      total: input.total,
      currency: input.currency,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: { id: true, number: true },
  });

  if (duplicate) {
    throw new InvoiceConflictError(
      `A similar invoice already exists for this client on that date (${duplicate.number}).`,
    );
  }
}

export async function nextInvoiceNumber(firmId: string, date = new Date()): Promise<string> {
  const prefix = `INV-${date.getUTCFullYear()}-`;
  const invoices = await db.invoice.findMany({
    where: { firmId, number: { startsWith: prefix } },
    select: { number: true },
  });

  const highest = invoices.reduce((max, invoice) => {
    const value = Number.parseInt(invoice.number.slice(prefix.length), 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

export async function createInvoice(
  firmId: string,
  input: InvoiceInput,
  actorId: string,
) {
  await assertClient(firmId, input.clientId);
  await assertNumberAvailable(firmId, input.number);

  const totals = calculateTotals(input.lines);
  await assertNotDuplicate(firmId, {
    clientId: input.clientId,
    issueDate: input.issueDate,
    total: totals.total,
    currency: input.currency,
  });

  const invoice = await db.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        firmId,
        clientId: input.clientId,
        number: input.number,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        notes: input.notes,
        subtotal: totals.subtotal,
        total: totals.total,
        createdById: actorId,
        lineItems: {
          create: totals.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            position: line.position,
          })),
        },
      },
      include: { lineItems: true },
    });
  });

  await recordAudit({
    firmId,
    actorId,
    action: "invoice.created",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { number: invoice.number, total: totals.total, clientId: invoice.clientId },
  });

  return invoice;
}

export async function updateInvoice(
  firmId: string,
  invoiceId: string,
  input: InvoiceUpdateInput,
  actorId: string,
) {
  const existing = await getInvoice(firmId, invoiceId);
  if (!existing) throw new InvoiceNotFoundError();
  if (existing.status !== "DRAFT") {
    throw new InvoiceStatusError("Only draft invoices can be edited.");
  }

  if (input.clientId) await assertClient(firmId, input.clientId);
  if (input.number) await assertNumberAvailable(firmId, input.number, invoiceId);

  const lines = input.lines ?? existing.lineItems.map((line) => ({
    description: line.description,
    quantity: line.quantity.toNumber(),
    unitPrice: line.unitPrice.toNumber(),
  }));
  const totals = calculateTotals(lines);

  await assertNotDuplicate(
    firmId,
    {
      clientId: input.clientId ?? existing.clientId,
      issueDate: input.issueDate ?? existing.issueDate,
      total: totals.total,
      currency: input.currency ?? existing.currency,
    },
    invoiceId,
  );

  const invoice = await db.$transaction(async (tx) => {
    await tx.invoiceLine.deleteMany({ where: { invoiceId } });
    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        ...input,
        subtotal: totals.subtotal,
        total: totals.total,
        lineItems: {
          create: totals.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            position: line.position,
          })),
        },
      },
      include: { lineItems: true },
    });
  });

  await recordAudit({
    firmId,
    actorId,
    action: "invoice.updated",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { number: invoice.number, total: totals.total },
  });

  return invoice;
}

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID", "OVERDUE"],
  OVERDUE: ["PAID"],
  PAID: [],
};

export async function setInvoiceStatus(
  firmId: string,
  invoiceId: string,
  status: InvoiceStatus,
  actorId: string,
) {
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, firmId } });
  if (!existing) throw new InvoiceNotFoundError();

  if (existing.status === status) return existing;

  if (!ALLOWED_TRANSITIONS[existing.status].includes(status)) {
    throw new InvoiceStatusError(
      `Invoice cannot move from ${existing.status} to ${status}.`,
    );
  }

  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "SENT" ? { sentAt: new Date() } : {}),
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
    },
  });

  await recordAudit({
    firmId,
    actorId,
    action: "invoice.status_changed",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { number: invoice.number, from: existing.status, to: status },
  });

  return invoice;
}

export async function bulkSetInvoiceStatus(
  firmId: string,
  ids: string[],
  action: "send" | "paid" | "overdue",
  actorId: string,
) {
  const target: InvoiceStatus = action === "send" ? "SENT" : action === "paid" ? "PAID" : "OVERDUE";
  const invoices = await db.invoice.findMany({
    where: { id: { in: ids }, firmId },
    select: { id: true },
  });

  let updated = 0;
  for (const invoice of invoices) {
    try {
      await setInvoiceStatus(firmId, invoice.id, target, actorId);
      updated += 1;
    } catch (error) {
      if (!(error instanceof InvoiceStatusError)) throw error;
    }
  }
  return updated;
}

export async function deleteInvoice(firmId: string, invoiceId: string, actorId: string) {
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, firmId } });
  if (!existing) throw new InvoiceNotFoundError();

  await db.invoice.delete({ where: { id: existing.id } });

  await recordAudit({
    firmId,
    actorId,
    action: "invoice.deleted",
    entityType: "invoice",
    entityId: existing.id,
    metadata: { number: existing.number, total: toNumber(existing.total) },
  });
}

export async function refreshOverdueInvoices(firmId: string): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const overdue = await db.invoice.findMany({
    where: { firmId, status: "SENT", dueDate: { lt: startOfToday } },
    select: { id: true, number: true, total: true },
  });

  if (overdue.length === 0) return 0;

  await db.invoice.updateMany({
    where: { id: { in: overdue.map((invoice) => invoice.id) }, firmId },
    data: { status: "OVERDUE" },
  });

  const recipients = await db.firmMember.findMany({
    where: { firmId, role: { in: ["OWNER", "ADMIN", "ACCOUNTANT"] } },
    select: { userId: true },
  });

  for (const invoice of overdue) {
    for (const recipient of recipients) {
      await createNotification({
        firmId,
        userId: recipient.userId,
        type: "INVOICE_OVERDUE",
        title: "Invoice is overdue",
        body: `${invoice.number} is overdue.`,
        href: `/invoices/${invoice.id}`,
      });
    }
  }

  return overdue.length;
}
