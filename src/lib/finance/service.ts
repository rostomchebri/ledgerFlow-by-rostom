import "server-only";

import {
  Prisma,
  type Invoice,
  type InvoiceStatus,
  type Transaction,
  type TransactionCategory,
  type TransactionType,
} from "@prisma/client";

import { db } from "@/lib/db";

import { percentChange } from "./format";
import { buildTransactionOrderBy, type TransactionListQuery } from "./query";
import {
  buildBuckets,
  resolvePeriod,
  type DashboardRange,
  type PeriodBucket,
} from "./ranges";

export type FinanceTotals = {
  revenue: number;
  expenses: number;
  net: number;
  invoices: number;
};

export type FinanceChange = {
  revenue: number | null;
  expenses: number | null;
  net: number | null;
  invoices: number | null;
};

export type ChartPoint = {
  label: string;
  revenue: number;
  expenses: number;
  invoices: number;
};

export type ExpenseSlice = {
  category: TransactionCategory;
  amount: number;
  percentage: number;
};

export type InvoiceStatusSummary = {
  status: InvoiceStatus;
  count: number;
  amount: number;
};

export type RecentTransaction = {
  id: string;
  description: string;
  reference: string | null;
  type: TransactionType;
  category: TransactionCategory;
  status: Transaction["status"];
  amount: number;
  occurredAt: Date;
  clientName: string | null;
};

export type TopClient = {
  clientId: string;
  name: string;
  revenue: number;
};

export type FinanceOverview = {
  range: DashboardRange;
  totals: FinanceTotals;
  changes: FinanceChange;
  series: ChartPoint[];
  expenseBreakdown: ExpenseSlice[];
  recentTransactions: RecentTransaction[];
  topClients: TopClient[];
  invoiceStatus: InvoiceStatusSummary[];
  openInvoices: { count: number; amount: number };
  overdueInvoices: { count: number; amount: number };
};

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function labelForBucket(start: Date, range: DashboardRange, locale: string): string {
  if (range === "year") {
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(start);
  }

  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(start);
}

type DailyTransactionRow = {
  day: Date;
  type: TransactionType;
  total: Prisma.Decimal | number | null;
};

type DailyInvoiceRow = {
  day: Date;
  count: number;
};

/**
 * Bucket boundaries come from `resolvePeriod`, which works in the server's
 * timezone. Truncate in that same zone inside Postgres so a local midnight that
 * is stored as the previous UTC day still lands in the right bucket.
 */
const SERVER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * `date_trunc` returns a UTC midnight. Re-anchor it to the same calendar day in
 * the server's timezone so it lines up with the local bucket boundaries.
 */
function localDayStart(day: Date): Date {
  return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}

function findBucketIndex(day: Date, buckets: PeriodBucket[]): number {
  const target = localDayStart(day).getTime();
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    if (!bucket) continue;
    if (target >= bucket.start.getTime() && target < bucket.end.getTime()) {
      return index;
    }
  }
  return -1;
}

/**
 * The dashboard is built from narrow SQL aggregates instead of loading every
 * transaction and invoice into Node. The firm id always comes from
 * `requireFirmContext()` — never from the URL.
 */
export async function getFinanceOverview(
  firmId: string,
  range: DashboardRange,
  locale: string,
): Promise<FinanceOverview> {
  const period = resolvePeriod(range);
  const buckets = buildBuckets(range, period);

  const [
    dailyTransactions,
    previousByType,
    expenseByCategory,
    topClientTotals,
    recent,
    dailyInvoices,
    previousInvoiceCount,
    allInvoiceStatuses,
    openInvoiceAggregate,
    overdueInvoiceAggregate,
  ] = await Promise.all([
    db.$queryRaw<DailyTransactionRow[]>`
      SELECT date_trunc(
               'day',
               "occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE ${SERVER_TIME_ZONE}
             ) AS day,
             "type" AS type,
             SUM("amount") AS total
      FROM "transactions"
      WHERE "firmId" = ${firmId}
        AND "occurredAt" >= ${period.start}
        AND "occurredAt" < ${period.end}
      GROUP BY 1, 2
    `,
    db.transaction.groupBy({
      by: ["type"],
      where: {
        firmId,
        occurredAt: { gte: period.previousStart, lt: period.previousEnd },
      },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["category"],
      where: {
        firmId,
        type: "EXPENSE",
        occurredAt: { gte: period.start, lt: period.end },
      },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["clientId"],
      where: {
        firmId,
        type: "INCOME",
        clientId: { not: null },
        occurredAt: { gte: period.start, lt: period.end },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    db.transaction.findMany({
      where: { firmId, occurredAt: { gte: period.start, lt: period.end } },
      include: { client: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
    db.$queryRaw<DailyInvoiceRow[]>`
      SELECT date_trunc(
               'day',
               "issueDate" AT TIME ZONE 'UTC' AT TIME ZONE ${SERVER_TIME_ZONE}
             ) AS day,
             COUNT(*)::int AS count
      FROM "invoices"
      WHERE "firmId" = ${firmId}
        AND "issueDate" >= ${period.start}
        AND "issueDate" < ${period.end}
      GROUP BY 1
    `,
    db.invoice.count({
      where: {
        firmId,
        issueDate: { gte: period.previousStart, lt: period.previousEnd },
      },
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { firmId },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: { firmId, status: { in: ["SENT", "OVERDUE"] } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: { firmId, status: "OVERDUE" },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  const revenue = dailyTransactions.reduce(
    (total, row) => (row.type === "INCOME" ? total + toNumber(row.total) : total),
    0,
  );
  const expenses = dailyTransactions.reduce(
    (total, row) => (row.type === "EXPENSE" ? total + toNumber(row.total) : total),
    0,
  );
  const previousRevenue = toNumber(
    previousByType.find((row) => row.type === "INCOME")?._sum.amount,
  );
  const previousExpenses = toNumber(
    previousByType.find((row) => row.type === "EXPENSE")?._sum.amount,
  );
  const net = revenue - expenses;
  const previousNet = previousRevenue - previousExpenses;
  const invoiceTotal = dailyInvoices.reduce((total, row) => total + Number(row.count), 0);

  const totals: FinanceTotals = {
    revenue,
    expenses,
    net,
    invoices: invoiceTotal,
  };

  const changes: FinanceChange = {
    revenue: percentChange(revenue, previousRevenue),
    expenses: percentChange(expenses, previousExpenses),
    net: percentChange(net, previousNet),
    invoices: percentChange(invoiceTotal, previousInvoiceCount),
  };

  const series: ChartPoint[] = buckets.map((bucket) => ({
    label: labelForBucket(bucket.start, range, locale),
    revenue: 0,
    expenses: 0,
    invoices: 0,
  }));

  for (const row of dailyTransactions) {
    const index = findBucketIndex(row.day, buckets);
    if (index < 0) continue;
    const point = series[index];
    if (!point) continue;
    if (row.type === "INCOME") point.revenue += toNumber(row.total);
    else if (row.type === "EXPENSE") point.expenses += toNumber(row.total);
  }

  for (const row of dailyInvoices) {
    const index = findBucketIndex(row.day, buckets);
    if (index < 0) continue;
    const point = series[index];
    if (!point) continue;
    point.invoices += Number(row.count);
  }

  const expenseBreakdown: ExpenseSlice[] = expenseByCategory
    .map((row) => ({
      category: row.category,
      amount: toNumber(row._sum.amount),
      percentage: 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .map((slice) => ({
      ...slice,
      percentage: expenses > 0 ? (slice.amount / expenses) * 100 : 0,
    }));

  const clientIds = topClientTotals
    .map((row) => row.clientId)
    .filter((id): id is string => id !== null);
  const clients = clientIds.length
    ? await db.client.findMany({
        where: { firmId, id: { in: clientIds } },
        select: { id: true, name: true },
      })
    : [];
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));

  const topClients: TopClient[] = topClientTotals
    .filter((row): row is typeof row & { clientId: string } => row.clientId !== null)
    .map((row) => ({
      clientId: row.clientId,
      name: clientNames.get(row.clientId) ?? "—",
      revenue: toNumber(row._sum.amount),
    }));

  const invoiceStatus: InvoiceStatusSummary[] = (["DRAFT", "SENT", "PAID", "OVERDUE"] as const).map(
    (status) => {
      const row = allInvoiceStatuses.find((entry) => entry.status === status);
      return {
        status,
        count: row?._count._all ?? 0,
        amount: toNumber(row?._sum.total),
      };
    },
  );

  return {
    range,
    totals,
    changes,
    series,
    expenseBreakdown,
    recentTransactions: recent.map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      reference: transaction.reference,
      type: transaction.type,
      category: transaction.category,
      status: transaction.status,
      amount: toNumber(transaction.amount),
      occurredAt: transaction.occurredAt,
      clientName: transaction.client?.name ?? null,
    })),
    topClients,
    invoiceStatus,
    openInvoices: {
      count: openInvoiceAggregate._count._all,
      amount: toNumber(openInvoiceAggregate._sum.total),
    },
    overdueInvoices: {
      count: overdueInvoiceAggregate._count._all,
      amount: toNumber(overdueInvoiceAggregate._sum.total),
    },
  };
}

// ---------------------------------------------------------------------------
// Transaction list
// ---------------------------------------------------------------------------

export const TRANSACTION_PAGE_SIZE = 12;
export const INVOICE_PAGE_SIZE = 12;

export {
  TRANSACTION_SORT_OPTIONS,
  buildTransactionOrderBy,
  formatDateInput,
  parseDateBoundary,
  parseTransactionQuery,
} from "./query";
export type {
  TransactionCategoryFilter,
  TransactionFilter,
  TransactionListQuery,
  TransactionSort,
} from "./query";

function transactionWhere(
  firmId: string,
  query: Pick<TransactionListQuery, "q" | "type" | "category" | "from" | "to">,
): Prisma.TransactionWhereInput {
  return {
    firmId,
    ...(query.type !== "ALL" ? { type: query.type } : {}),
    ...(query.category !== "ALL" ? { category: query.category } : {}),
    ...(query.from || query.to
      ? {
          occurredAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { description: { contains: query.q, mode: "insensitive" } },
            { reference: { contains: query.q, mode: "insensitive" } },
            { client: { name: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export type TransactionListResult = {
  items: Array<Transaction & { client: { id: string; name: string } | null }>;
  total: number;
  page: number;
  pageCount: number;
  income: number;
  expenses: number;
};

export async function listTransactions(
  firmId: string,
  query: TransactionListQuery,
): Promise<TransactionListResult> {
  const where = transactionWhere(firmId, query);

  const [items, total, grouped] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: buildTransactionOrderBy(query.sort),
      skip: (query.page - 1) * TRANSACTION_PAGE_SIZE,
      take: TRANSACTION_PAGE_SIZE,
    }),
    db.transaction.count({ where }),
    db.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / TRANSACTION_PAGE_SIZE)),
    income: toNumber(grouped.find((row) => row.type === "INCOME")?._sum.amount),
    expenses: toNumber(grouped.find((row) => row.type === "EXPENSE")?._sum.amount),
  };
}

// ---------------------------------------------------------------------------
// Invoice list
// ---------------------------------------------------------------------------

export type InvoiceFilter = "ALL" | InvoiceStatus;

export type InvoiceListQuery = {
  q: string;
  status: InvoiceFilter;
  page: number;
};

export function parseInvoiceQuery(
  params: Record<string, string | string[] | undefined>,
): InvoiceListQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const rawStatus = first(params.status)?.toUpperCase() as InvoiceStatus | undefined;
  const page = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    status:
      rawStatus && ["DRAFT", "SENT", "PAID", "OVERDUE"].includes(rawStatus) ? rawStatus : "ALL",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export type InvoiceListResult = {
  items: Array<Invoice & { client: { id: string; name: string } }>;
  total: number;
  page: number;
  pageCount: number;
  statuses: InvoiceStatusSummary[];
};

export async function listInvoices(
  firmId: string,
  query: InvoiceListQuery,
): Promise<InvoiceListResult> {
  const where: Prisma.InvoiceWhereInput = {
    firmId,
    ...(query.status !== "ALL" ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: "insensitive" } },
            { client: { name: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total, grouped] = await Promise.all([
    db.invoice.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
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

  const statuses: InvoiceStatusSummary[] = (["DRAFT", "SENT", "PAID", "OVERDUE"] as const).map(
    (status) => {
      const row = grouped.find((entry) => entry.status === status);
      return {
        status,
        count: row?._count._all ?? 0,
        amount: toNumber(row?._sum.total),
      };
    },
  );

  return {
    items,
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / INVOICE_PAGE_SIZE)),
    statuses,
  };
}

// ---------------------------------------------------------------------------
// Shared aggregates
// ---------------------------------------------------------------------------

export async function getClientStats(firmId: string) {
  const [total, active, companies, individuals] = await Promise.all([
    db.client.count({ where: { firmId } }),
    db.client.count({ where: { firmId, status: "ACTIVE" } }),
    db.client.count({ where: { firmId, type: "COMPANY" } }),
    db.client.count({ where: { firmId, type: "INDIVIDUAL" } }),
  ]);

  return { total, active, companies, individuals };
}
