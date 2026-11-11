import type { Prisma, TransactionCategory, TransactionType } from "@prisma/client";

/**
 * Pure parsing and ordering helpers for the transaction register.
 *
 * Kept separate from the server-only service so the same rules can be unit
 * tested and reused by filters without pulling Prisma into the client bundle.
 */
export const TRANSACTION_SORT_OPTIONS = [
  "date-desc",
  "date-asc",
  "amount-desc",
  "amount-asc",
] as const;

export type TransactionSort = (typeof TRANSACTION_SORT_OPTIONS)[number];

export type TransactionFilter = "ALL" | TransactionType;
export type TransactionCategoryFilter = "ALL" | TransactionCategory;

/** Mirrors the Prisma enum so malformed URL values cannot reach the database. */
export const TRANSACTION_CATEGORIES = [
  "SALES",
  "SERVICES",
  "OPERATIONS",
  "MARKETING",
  "SOFTWARE",
  "PAYROLL",
  "OTHER",
] as const satisfies readonly TransactionCategory[];

export type TransactionListQuery = {
  q: string;
  type: TransactionFilter;
  category: TransactionCategoryFilter;
  sort: TransactionSort;
  from?: Date;
  to?: Date;
  page: number;
};

/** Parses a `YYYY-MM-DD` filter value into a stable day boundary. */
export function parseDateBoundary(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

export function formatDateInput(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTransactionQuery(
  params: Record<string, string | string[] | undefined>,
): TransactionListQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const rawType = first(params.type)?.toUpperCase();
  const rawCategory = first(params.category)?.toUpperCase();
  const rawSort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const from = parseDateBoundary(first(params.from));
  const to = parseDateBoundary(first(params.to), true);
  const invalidRange = Boolean(from && to && from > to);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    type: rawType === "INCOME" || rawType === "EXPENSE" ? rawType : "ALL",
    category: TRANSACTION_CATEGORIES.includes(rawCategory as TransactionCategory)
      ? (rawCategory as TransactionCategory)
      : "ALL",
    sort: TRANSACTION_SORT_OPTIONS.includes(rawSort as TransactionSort)
      ? (rawSort as TransactionSort)
      : "date-desc",
    from: invalidRange ? undefined : from,
    to: invalidRange ? undefined : to,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildTransactionOrderBy(
  sort: TransactionSort,
): Prisma.TransactionOrderByWithRelationInput[] {
  switch (sort) {
    case "date-asc":
      return [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }];
    case "amount-desc":
      return [{ amount: "desc" }, { occurredAt: "desc" }, { id: "asc" }];
    case "amount-asc":
      return [{ amount: "asc" }, { occurredAt: "desc" }, { id: "asc" }];
    case "date-desc":
    default:
      return [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  }
}
