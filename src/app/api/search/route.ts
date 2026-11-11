import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission, can } from "@/lib/rbac";
import {
  EMPTY_SEARCH_RESULTS,
  normalizeSearchTerm,
  SEARCH_RESULT_LIMIT,
  type SearchResults,
} from "@/lib/search";

function decimalToNumber(value: { toNumber: () => number } | number | null): number {
  if (value === null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

/**
 * GET /api/search?q=… — tenant-scoped quick search for the command palette.
 *
 * Every query is scoped to the firm resolved from the session, and each
 * entity is only searched when the role can read it. A short or missing query
 * returns an empty result set rather than scanning the whole workspace.
 */
export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "client.read");

    const term = normalizeSearchTerm(new URL(request.url).searchParams.get("q"));
    if (!term) {
      return NextResponse.json({ data: EMPTY_SEARCH_RESULTS });
    }

    const canReadInvoices = can(role, "invoice.read");
    const canReadTasks = can(role, "task.read");

    const [clients, invoices, transactions, tasks] = await Promise.all([
      db.client.findMany({
        where: {
          firmId,
          archivedAt: null,
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { contactName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { reference: { contains: term, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, status: true },
        orderBy: { name: "asc" },
        take: SEARCH_RESULT_LIMIT,
      }),
      canReadInvoices
        ? db.invoice.findMany({
            where: {
              firmId,
              OR: [
                { number: { contains: term, mode: "insensitive" } },
                { client: { name: { contains: term, mode: "insensitive" } } },
              ],
            },
            select: {
              id: true,
              number: true,
              total: true,
              status: true,
              client: { select: { name: true } },
            },
            orderBy: { issueDate: "desc" },
            take: SEARCH_RESULT_LIMIT,
          })
        : Promise.resolve([]),
      db.transaction.findMany({
        where: {
          firmId,
          OR: [
            { description: { contains: term, mode: "insensitive" } },
            { reference: { contains: term, mode: "insensitive" } },
            { client: { name: { contains: term, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          description: true,
          amount: true,
          type: true,
          occurredAt: true,
          client: { select: { name: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: SEARCH_RESULT_LIMIT,
      }),
      canReadTasks
        ? db.task.findMany({
            where: {
              firmId,
              OR: [
                { title: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
                { client: { name: { contains: term, mode: "insensitive" } } },
              ],
            },
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              client: { select: { name: true } },
            },
            orderBy: { dueDate: "asc" },
            take: SEARCH_RESULT_LIMIT,
          })
        : Promise.resolve([]),
    ]);

    const data: SearchResults = {
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        status: client.status,
        href: `/clients/${client.id}`,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        clientName: invoice.client.name,
        total: decimalToNumber(invoice.total),
        status: invoice.status,
        href: `/invoices/${invoice.id}`,
      })),
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        clientName: transaction.client?.name ?? null,
        amount: decimalToNumber(transaction.amount),
        type: transaction.type,
        occurredAt: transaction.occurredAt.toISOString(),
        href: `/transactions/${transaction.id}`,
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        clientName: task.client?.name ?? null,
        status: task.status,
        dueDate: task.dueDate?.toISOString() ?? null,
        href: `/tasks/${task.id}`,
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
