import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ScrollText, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listAuditLogs, parseAuditListQuery, type AuditListQuery } from "@/lib/audit/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("audit.meta");
  return { title: t("title"), description: t("description") };
}

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(query: AuditListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.action) params.set("action", query.action);
  if (query.pageSize !== 25) params.set("pageSize", String(query.pageSize));
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/settings/audit?${suffix}` : "/settings/audit";
}

const COMMON_ACTIONS = [
  "client.created",
  "client.updated",
  "client.archived",
  "invoice.created",
  "invoice.status_changed",
  "document.uploaded",
  "task.created",
  "task.status_changed",
  "member.invited",
  "member.role_changed",
  "transaction.created",
];

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const t = await getTranslations("audit");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "audit.read")) redirect("/settings");

  const query = parseAuditListQuery(await searchParams);
  const result = await listAuditLogs(firmId, query);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link href="/settings" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>

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

      <form method="get" className="glass-card flex flex-col gap-3 rounded-2xl p-4 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            defaultValue={query.q}
            placeholder={t("filters.searchPlaceholder")}
            aria-label={t("filters.search")}
            className="ps-10"
          />
        </div>
        <Select
          name="action"
          defaultValue={query.action}
          aria-label={t("filters.action")}
          className="lg:w-56"
        >
          <option value="">{t("filters.allActions")}</option>
          {COMMON_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {t.has(`actions.${action}`) ? t(`actions.${action}`) : action}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonVariants({ variant: "default" })}>
          {t("filters.apply")}
        </button>
        <Link href="/settings/audit" className={buttonVariants({ variant: "outline" })}>
          {t("filters.clear")}
        </Link>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <ScrollText aria-hidden="true" className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                {t("entries", { count: result.total })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-[hsl(var(--border)/0.5)]">
                {result.items.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{entry.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.entityType}
                          {entry.entityId ? ` · ${entry.entityId.slice(0, 12)}` : ""}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {dateFormatter.format(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.actor ? `${entry.actor.name} · ${entry.actor.email}` : t("systemActor")}
                    </p>
                    {entry.metadata ? (
                      <pre className="mt-1 max-h-24 overflow-auto rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        {JSON.stringify(entry.metadata)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("pagination.showing", {
                from: (result.page - 1) * result.pageSize + 1,
                to: Math.min(result.page * result.pageSize, result.total),
                total: result.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              {result.page > 1 ? (
                <Link
                  href={buildHref(query, result.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("pagination.previous")}
                </Link>
              ) : null}
              <span className="px-2 text-xs text-muted-foreground">
                {result.page} / {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Link
                  href={buildHref(query, result.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("pagination.next")}
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
