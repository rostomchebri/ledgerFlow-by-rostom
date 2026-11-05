import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { InvoiceFilters } from "@/components/finance/invoice-filters";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/finance/format";
import { requireFirmContext } from "@/lib/firm-context";
import {
  INVOICE_PAGE_SIZE,
  listInvoices,
  parseInvoiceQuery,
  type InvoiceListQuery,
  type InvoiceStatusSummary,
} from "@/lib/invoices/service";
import { can } from "@/lib/rbac";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invoices.meta");
  return { title: t("title"), description: t("description") };
}

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(query: InvoiceListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.clientId) params.set("clientId", query.clientId);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/invoices?${suffix}` : "/invoices";
}

function statusAmount(statuses: InvoiceStatusSummary[], wanted: string[]): number {
  return statuses
    .filter((entry) => wanted.includes(entry.status))
    .reduce((total, entry) => total + entry.amount, 0);
}

function statusCount(statuses: InvoiceStatusSummary[], wanted: string[]): number {
  return statuses
    .filter((entry) => wanted.includes(entry.status))
    .reduce((total, entry) => total + entry.count, 0);
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const t = await getTranslations("invoices");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const canWrite = can(role, "invoice.write");
  const query = parseInvoiceQuery(await searchParams);
  const result = await listInvoices(firmId, query);

  const from = result.total === 0 ? 0 : (result.page - 1) * INVOICE_PAGE_SIZE + 1;
  const to = Math.min(result.page * INVOICE_PAGE_SIZE, result.total);
  const outstanding = statusAmount(result.statuses, ["SENT", "OVERDUE"]);
  const overdue = statusAmount(result.statuses, ["OVERDUE"]);
  const paid = statusAmount(result.statuses, ["PAID"]);
  const draft = statusAmount(result.statuses, ["DRAFT"]);

  const rows = result.items.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.client.name,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    status: invoice.status,
    total: Number(invoice.total),
    currency: invoice.currency,
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            />
            {t("eyebrow")}
          </p>
          <h1 className="text-gradient text-[30px] font-bold leading-tight tracking-[-0.04em] sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/api/reports/invoices/export" className={buttonVariants({ variant: "outline" })}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("export")}
          </Link>
          {canWrite ? (
            <Link href="/invoices/new" className={buttonVariants({ variant: "default" })}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t("new")}
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceSummary
          label={t("summary.paid")}
          value={formatCurrency(paid, locale)}
          countLabel={t("count", { count: statusCount(result.statuses, ["PAID"]) })}
          icon={CheckCircle2}
          tone="emerald"
        />
        <InvoiceSummary
          label={t("summary.outstanding")}
          value={formatCurrency(outstanding, locale)}
          countLabel={t("count", {
            count: statusCount(result.statuses, ["SENT", "OVERDUE"]),
          })}
          icon={Clock3}
          tone="blue"
        />
        <InvoiceSummary
          label={t("summary.overdue")}
          value={formatCurrency(overdue, locale)}
          countLabel={t("count", { count: statusCount(result.statuses, ["OVERDUE"]) })}
          icon={AlertTriangle}
          tone="rose"
        />
        <InvoiceSummary
          label={t("summary.draft")}
          value={formatCurrency(draft, locale)}
          countLabel={t("count", { count: statusCount(result.statuses, ["DRAFT"]) })}
          icon={FileText}
          tone="purple"
        />
      </section>

      <InvoiceFilters query={query} />

      {result.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("table.emptyTitle")}
          description={t("table.emptyBody")}
          action={
            canWrite ? (
              <Link href="/invoices/new" className={buttonVariants({ variant: "default" })}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("new")}
              </Link>
            ) : (
              <Link href="/invoices" className={buttonVariants({ variant: "outline" })}>
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                {t("filters.clear")}
              </Link>
            )
          }
        />
      ) : (
        <>
          <InvoiceTable rows={rows} locale={locale} canWrite={canWrite} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("pagination.showing", { from, to, total: result.total })}
            </p>
            <div className="flex items-center gap-2">
              {result.page > 1 ? (
                <Link
                  href={buildHref(query, result.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("pagination.previous")}
                </Link>
              ) : (
                <span
                  className={
                    buttonVariants({ variant: "outline", size: "sm" }) +
                    " pointer-events-none opacity-40"
                  }
                >
                  {t("pagination.previous")}
                </span>
              )}
              <span className="px-2 text-xs font-medium text-muted-foreground">
                {result.page} / {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Link
                  href={buildHref(query, result.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("pagination.next")}
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
                </Link>
              ) : (
                <span
                  className={
                    buttonVariants({ variant: "outline", size: "sm" }) +
                    " pointer-events-none opacity-40"
                  }
                >
                  {t("pagination.next")}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InvoiceSummary({
  label,
  value,
  countLabel,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  countLabel: string;
  icon: typeof FileText;
  tone: "blue" | "rose" | "emerald" | "purple";
}) {
  const tones = {
    blue: "border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    rose: "border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    purple: "border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  } as const;

  return (
    <div className="glass-card glass-card-hover flex items-center gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold tabular-nums tracking-[-0.025em]">
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground">{countLabel}</p>
      </div>
    </div>
  );
}
