import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Search, Users } from "lucide-react";

import { ClientFilters } from "@/components/clients/client-filters";
import { ClientPagination } from "@/components/clients/client-pagination";
import { ClientsTable } from "@/components/clients/clients-table";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { buildClientsHref, hasActiveClientFilters } from "@/lib/clients/links";
import { parseClientListQuery } from "@/lib/clients/schema";
import { listClients } from "@/lib/clients/service";
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
  const result = await listClients(firmId, query);
  const canWrite = can(role, "client.write");

  // Keep deep links tidy: an out-of-range page lands on the last real page.
  if (result.total > 0 && query.page > result.pageCount) {
    redirect(buildClientsHref(query, { page: result.pageCount }));
  }

  const filtersActive = hasActiveClientFilters(query);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {canWrite ? (
          <Link
            href="/clients/new"
            className={buttonVariants({ className: "self-start sm:self-auto" })}
          >
            <Plus className="h-4 w-4" />
            {t("newClient")}
          </Link>
        ) : null}
      </div>

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
