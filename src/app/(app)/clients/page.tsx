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
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ClientStat
          label={t("stats.total")}
          value={formatNumber(stats.total, locale)}
          icon={Users}
          tone="blue"
        />
        <ClientStat
          label={t("stats.active")}
          value={formatNumber(stats.active, locale)}
          icon={Users}
          tone="emerald"
        />
        <ClientStat
          label={t("stats.companies")}
          value={formatNumber(stats.companies, locale)}
          icon={Building2}
          tone="purple"
        />
        <ClientStat
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

function ClientStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone: "blue" | "emerald" | "purple" | "orange";
}) {
  const tones = {
    blue: "border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    purple: "border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    orange: "border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  } as const;

  return (
    <div className="glass-card glass-card-hover flex items-center gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums tracking-[-0.025em]">{value}</p>
      </div>
    </div>
  );
}
