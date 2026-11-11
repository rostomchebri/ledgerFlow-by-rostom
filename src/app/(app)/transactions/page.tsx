import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  PiggyBank,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { TransactionFilters } from "@/components/finance/transaction-filters";
import { TransactionDeleteButton } from "@/components/transactions/transaction-delete-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationBar } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/clients/format";
import { formatCurrency, formatNumber } from "@/lib/finance/format";
import {
  formatDateInput,
  listTransactions,
  parseTransactionQuery,
  TRANSACTION_PAGE_SIZE,
} from "@/lib/finance/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";

const CATEGORY_COLORS: Record<string, string> = {
  SALES: "bg-blue-500",
  SERVICES: "bg-sky-400",
  OPERATIONS: "bg-indigo-500",
  MARKETING: "bg-orange-500",
  SOFTWARE: "bg-violet-500",
  PAYROLL: "bg-cyan-500",
  OTHER: "bg-slate-400",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("transactions.meta");
  return { title: t("title"), description: t("description") };
}

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(query: ReturnType<typeof parseTransactionQuery>, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type !== "ALL") params.set("type", query.type);
  if (query.category !== "ALL") params.set("category", query.category);
  if (query.sort !== "date-desc") params.set("sort", query.sort);
  if (query.from) params.set("from", formatDateInput(query.from));
  if (query.to) params.set("to", formatDateInput(query.to));
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/transactions?${suffix}` : "/transactions";
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const t = await getTranslations("transactions");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const canWrite = can(role, "client.write");
  const query = parseTransactionQuery(await searchParams);
  const result = await listTransactions(firmId, query);

  const net = result.income - result.expenses;
  const from = result.total === 0 ? 0 : (result.page - 1) * TRANSACTION_PAGE_SIZE + 1;
  const to = Math.min(result.page * TRANSACTION_PAGE_SIZE, result.total);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Link href="/api/reports/transactions/export" className={buttonVariants({ variant: "outline" })}>
              <ReceiptText aria-hidden="true" className="h-4 w-4" />
              {t("export")}
            </Link>
            {canWrite ? (
              <Link href="/transactions/new" className={buttonVariants({ variant: "default" })}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("new")}
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("summary.income")}
          value={formatCurrency(result.income, locale)}
          icon={Banknote}
          tone="emerald"
        />
        <StatCard
          label={t("summary.expenses")}
          value={formatCurrency(result.expenses, locale)}
          icon={CreditCard}
          tone="rose"
        />
        <StatCard
          label={t("summary.net")}
          value={formatCurrency(net, locale)}
          icon={PiggyBank}
          tone={net >= 0 ? "blue" : "rose"}
        />
        <StatCard
          label={t("summary.count")}
          value={formatNumber(result.total, locale)}
          icon={ArrowLeftRight}
          tone="purple"
        />
      </section>

      <TransactionFilters query={query} />

      {result.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("table.emptyTitle")}
          description={t("table.emptyBody")}
          action={
            <Link href="/transactions" className={buttonVariants({ variant: "outline" })}>
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              {t("filters.clear")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-5 py-3 text-start font-medium">{t("table.date")}</th>
                    <th className="px-3 py-3 text-start font-medium">{t("table.description")}</th>
                    <th className="hidden px-3 py-3 text-start font-medium lg:table-cell">
                      {t("table.client")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium md:table-cell">
                      {t("table.category")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium sm:table-cell">
                      {t("table.status")}
                    </th>
                    <th className="px-5 py-3 text-end font-medium">{t("table.amount")}</th>
                    {canWrite ? (
                      <th className="px-5 py-3 text-end font-medium">{t("table.actions")}</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        {formatDate(transaction.occurredAt, locale)}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="max-w-72 truncate font-medium">{transaction.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.reference ?? "—"}
                        </p>
                      </td>
                      <td className="hidden max-w-48 truncate px-3 py-3.5 text-muted-foreground lg:table-cell">
                        {transaction.client?.name ?? t("table.noClient")}
                      </td>
                      <td className="hidden px-3 py-3.5 md:table-cell">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-full ${
                              CATEGORY_COLORS[transaction.category] ?? "bg-slate-400"
                            }`}
                          />
                          <span className="text-muted-foreground">
                            {t(`categories.${transaction.category}`)}
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-3 py-3.5 sm:table-cell">
                        <Badge variant={transaction.status === "CLEARED" ? "success" : "muted"}>
                          {t(`statuses.${transaction.status}`)}
                        </Badge>
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-end font-semibold tabular-nums ${
                          transaction.type === "INCOME"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {transaction.type === "INCOME" ? "+" : "−"}
                        {formatCurrency(Number(transaction.amount), locale)}
                      </td>
                      {canWrite ? (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/transactions/${transaction.id}/edit`}
                              className={buttonVariants({ variant: "ghost", size: "icon" })}
                              title={t("table.edit")}
                            >
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                              <span className="sr-only">{t("table.edit")}</span>
                            </Link>
                            <TransactionDeleteButton transactionId={transaction.id} />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            summary={t("pagination.showing", { from, to, total: result.total })}
            page={result.page}
            pageCount={result.pageCount}
            previousHref={result.page > 1 ? buildHref(query, result.page - 1) : null}
            nextHref={result.page < result.pageCount ? buildHref(query, result.page + 1) : null}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
          />
        </>
      )}
    </div>
  );
}

