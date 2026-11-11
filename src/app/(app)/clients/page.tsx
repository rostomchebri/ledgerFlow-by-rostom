import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, Download, Plus, Search, UserRound, Users } from "lucide-react";

import { ClientFilters } from "@/components/clients/client-filters";
import { ClientPagination } from "@/components/clients/client-pagination";
import { ClientsTable } from "@/components/clients/clients-table";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { buildClientsHref, hasActiveClientFilters } from "@/lib/clients/links";
import { parseClientListQuery } from "@/lib/clients/schema";
import { listClients } from "@/lib/clients/service";
import { formatNumber } from "@/lib/finance/format";
import { getClientStats } from "@/lib/finance/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clients.meta");
  return {
    title: t("listTitle"),
    description: t("listDescription"),
  };
}

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const t = await getTranslations("clients.list");
  const locale = await getLocale();
  const query = parseClientListQuery(await searchParams);
  const { firmId, role } = await requireFirmContext();
  const [result, stats] = await Promise.all([listClients(firmId, query), getClientStats(firmId)]);
  const canWrite = can(role, "client.write");

  // Keep deep links tidy: an out-of-range page lands on the last real page.
  if (result.total > 0 && query.page > result.pageCount) {
    redirect(buildClientsHref(query, { page: result.pageCount }));
  }

  const filtersActive = hasActiveClientFilters(query);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Link
              href="/api/reports/clients/export"
              className={buttonVariants({
                variant: "outline",
                className: "h-11 self-start rounded-xl sm:self-auto",
              })}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("export")}
            </Link>
            {canWrite ? (
              <Link
                href="/clients/new"
                className={buttonVariants({ className: "h-11 self-start rounded-xl sm:self-auto" })}
              >
                <Plus className="h-4 w-4" />
                {t("newClient")}
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("stats.total")}
          value={formatNumber(stats.total, locale)}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label={t("stats.active")}
          value={formatNumber(stats.active, locale)}
          icon={Users}
          tone="emerald"
        />
        <StatCard
          label={t("stats.companies")}
          value={formatNumber(stats.companies, locale)}
          icon={Building2}
          tone="purple"
        />
        <StatCard
          label={t("stats.individuals")}
          value={formatNumber(stats.individuals, locale)}
          icon={UserRound}
          tone="orange"
        />
      </section>

      <ClientFilters query={query} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {filtersActive
            ? t("countFiltered", { count: result.total })
            : t("count", { count: result.total })}
        </p>
      </div>

      {result.items.length > 0 ? (
        <>
          <ClientsTable clients={result.items} locale={locale} />
          <ClientPagination query={query} result={result} />
        </>
      ) : filtersActive ? (
        <EmptyState
          icon={Search}
          title={t("emptyFilteredTitle")}
          description={t("emptyFilteredDescription")}
          action={
            <Link href="/clients" className={buttonVariants({ variant: "outline" })}>
              {t("clearFilters")}
            </Link>
          }
        />
      ) : (
        <EmptyState
          icon={Users}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            canWrite ? (
              <Link href="/clients/new" className={buttonVariants()}>
                <Plus className="h-4 w-4" />
                {t("createClient")}
              </Link>
            ) : null
          }
        />
      )}
    </div>
  );
}
