import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
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
import { PageHeader } from "@/components/ui/page-header";
import { PaginationBar } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/finance/format";
import { formatDateInput } from "@/lib/finance/query";
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
  if (query.sort !== "issue-desc") params.set("sort", query.sort);
  if (query.from) params.set("from", formatDateInput(query.from));
  if (query.to) params.set("to", formatDateInput(query.to));
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
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
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
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("summary.paid")}
          value={formatCurrency(paid, locale)}
          hint={t("count", { count: statusCount(result.statuses, ["PAID"]) })}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label={t("summary.outstanding")}
          value={formatCurrency(outstanding, locale)}
          hint={t("count", { count: statusCount(result.statuses, ["SENT", "OVERDUE"]) })}
          icon={Clock3}
          tone="blue"
        />
        <StatCard
          label={t("summary.overdue")}
          value={formatCurrency(overdue, locale)}
          hint={t("count", { count: statusCount(result.statuses, ["OVERDUE"]) })}
          icon={AlertTriangle}
          tone="rose"
        />
        <StatCard
          label={t("summary.draft")}
          value={formatCurrency(draft, locale)}
          hint={t("count", { count: statusCount(result.statuses, ["DRAFT"]) })}
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

