import "server-only";

import type {
  Invoice,
  InvoiceStatus,
  Prisma,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@prisma/client";

import { db } from "@/lib/db";

import { percentChange } from "./format";
import { buildBuckets, resolvePeriod, type DashboardRange } from "./ranges";

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

function sumTransactions(transactions: Transaction[], type: TransactionType): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + toNumber(transaction.amount), 0);
}

function labelForBucket(start: Date, range: DashboardRange, locale: string): string {
  if (range === "year") {
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(start);
  }

  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(start);
}

/**
 * One read per transaction/invoice table for the whole dashboard. The firm id
 * always comes from `requireFirmContext()` — never from the URL.
 */
export async function getFinanceOverview(
  firmId: string,
  range: DashboardRange,
  locale: string,
): Promise<FinanceOverview> {
  const period = resolvePeriod(range);
  const buckets = buildBuckets(range, period);

  const [
    currentTransactions,
    previousTransactions,
    currentInvoices,
    previousInvoiceCount,
    recent,
    allInvoiceStatuses,
    openInvoiceAggregate,
    overdueInvoiceAggregate,
  ] = await Promise.all([
    db.transaction.findMany({
      where: { firmId, occurredAt: { gte: period.start, lt: period.end } },
      include: { client: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    db.transaction.findMany({
      where: {
        firmId,
        occurredAt: { gte: period.previousStart, lt: period.previousEnd },
      },
    }),
    db.invoice.findMany({
      where: { firmId, issueDate: { gte: period.start, lt: period.end } },
      select: { issueDate: true },
    }),
    db.invoice.count({
      where: {
        firmId,
        issueDate: { gte: period.previousStart, lt: period.previousEnd },
      },
    }),
    db.transaction.findMany({
      where: { firmId, occurredAt: { gte: period.start, lt: period.end } },
      include: { client: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 6,
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

  const revenue = sumTransactions(currentTransactions, "INCOME");
  const expenses = sumTransactions(currentTransactions, "EXPENSE");
  const previousRevenue = sumTransactions(previousTransactions, "INCOME");
  const previousExpenses = sumTransactions(previousTransactions, "EXPENSE");
  const net = revenue - expenses;
  const previousNet = previousRevenue - previousExpenses;

  const totals: FinanceTotals = {
    revenue,
    expenses,
    net,
    invoices: currentInvoices.length,
  };

  const changes: FinanceChange = {
    revenue: percentChange(revenue, previousRevenue),
    expenses: percentChange(expenses, previousExpenses),
    net: percentChange(net, previousNet),
    invoices: percentChange(currentInvoices.length, previousInvoiceCount),
  };

  const series: ChartPoint[] = buckets.map((bucket) => {
    const bucketTransactions = currentTransactions.filter(
      (transaction) =>
        transaction.occurredAt >= bucket.start && transaction.occurredAt < bucket.end,
    );
    const bucketInvoices = currentInvoices.filter(
      (invoice) => invoice.issueDate >= bucket.start && invoice.issueDate < bucket.end,
    );

    return {
      label: labelForBucket(bucket.start, range, locale),
      revenue: sumTransactions(bucketTransactions, "INCOME"),
      expenses: sumTransactions(bucketTransactions, "EXPENSE"),
      invoices: bucketInvoices.length,
    };
  });

  const expensesByCategory = new Map<TransactionCategory, number>();
  for (const transaction of currentTransactions) {
    if (transaction.type !== "EXPENSE") continue;
    expensesByCategory.set(
      transaction.category,
      (expensesByCategory.get(transaction.category) ?? 0) + toNumber(transaction.amount),
    );
  }

  const expenseBreakdown: ExpenseSlice[] = [...expensesByCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const revenueByClient = new Map<string, TopClient>();
  for (const transaction of currentTransactions) {
    if (transaction.type !== "INCOME" || !transaction.clientId) continue;
    const existing = revenueByClient.get(transaction.clientId);
    revenueByClient.set(transaction.clientId, {
      clientId: transaction.clientId,
      name: transaction.client?.name ?? "—",
      revenue: (existing?.revenue ?? 0) + toNumber(transaction.amount),
    });
  }

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
    topClients: [...revenueByClient.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
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

export type TransactionFilter = "ALL" | TransactionType;
export type TransactionCategoryFilter = "ALL" | TransactionCategory;

export type TransactionListQuery = {
  q: string;
  type: TransactionFilter;
  category: TransactionCategoryFilter;
  page: number;
};

export function parseTransactionQuery(
  params: Record<string, string | string[] | undefined>,
): TransactionListQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const rawType = first(params.type)?.toUpperCase();
  const rawCategory = first(params.category)?.toUpperCase();
  const page = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    type: rawType === "INCOME" || rawType === "EXPENSE" ? rawType : "ALL",
    category: rawCategory && rawCategory !== "ALL" ? (rawCategory as TransactionCategory) : "ALL",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function transactionWhere(
  firmId: string,
  query: Pick<TransactionListQuery, "q" | "type" | "category">,
): Prisma.TransactionWhereInput {
  return {
    firmId,
    ...(query.type !== "ALL" ? { type: query.type } : {}),
    ...(query.category !== "ALL" ? { category: query.category } : {}),
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
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
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
