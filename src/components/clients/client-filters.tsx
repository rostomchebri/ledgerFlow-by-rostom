"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildClientsHref, hasActiveClientFilters } from "@/lib/clients/links";
import type { ClientListQuery } from "@/lib/clients/schema";
import { cn } from "@/lib/utils";

type ClientFiltersProps = {
  query: ClientListQuery;
};

const labelClass = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function ClientFilters({ query }: ClientFiltersProps) {
  const router = useRouter();
  const t = useTranslations("clients.filters");
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);

  // Keep the input in sync when the URL changes (clear link, back/forward).
  useEffect(() => {
    setSearch(query.q);
  }, [query.q]);

  function apply(overrides: Partial<ClientListQuery>) {
    const href = buildClientsHref(query, { ...overrides, page: overrides.page ?? 1 });
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <form
      role="search"
      className="glass-card rounded-2xl p-4"
      onSubmit={(event) => {
        event.preventDefault();
        apply({ q: search });
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="client-search" className={labelClass}>
            {t("search")}
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="client-search"
              name="q"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pe-9 ps-9"
              maxLength={120}
              autoComplete="off"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  apply({ q: "" });
                }}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("clearSearch")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <div className="space-y-1.5">
            <label htmlFor="client-status" className={labelClass}>
              {t("status")}
            </label>
            <Select
              id="client-status"
              value={query.status}
              onChange={(event) =>
                apply({ status: event.target.value as ClientListQuery["status"] })
              }
            >
              <option value="active">{t("active")}</option>
              <option value="archived">{t("archived")}</option>
              <option value="all">{t("all")}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="client-type" className={labelClass}>
              {t("type")}
            </label>
            <Select
              id="client-type"
              value={query.type}
              onChange={(event) => apply({ type: event.target.value as ClientListQuery["type"] })}
            >
              <option value="all">{t("allTypes")}</option>
              <option value="company">{t("company")}</option>
              <option value="individual">{t("individual")}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="client-sort" className={labelClass}>
              {t("sort")}
            </label>
            <Select
              id="client-sort"
              value={query.sort}
              onChange={(event) => apply({ sort: event.target.value as ClientListQuery["sort"] })}
            >
              <option value="name-asc">{t("nameAsc")}</option>
              <option value="name-desc">{t("nameDesc")}</option>
              <option value="updated-desc">{t("updatedDesc")}</option>
              <option value="created-desc">{t("createdDesc")}</option>
              <option value="created-asc">{t("createdAsc")}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="client-page-size" className={labelClass}>
              {t("perPage")}
            </label>
            <Select
              id="client-page-size"
              value={String(query.pageSize)}
              onChange={(event) =>
                apply({ pageSize: Number(event.target.value) as ClientListQuery["pageSize"] })
              }
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("searchAction")}
          </Button>
          {hasActiveClientFilters(query) ? (
            <Link href="/clients" className={cn(buttonVariants({ variant: "ghost" }), "px-2")}>
              <X className="h-3.5 w-3.5" />
              {t("clear")}
            </Link>
          ) : null}
        </div>
      </div>

      <p aria-live="polite" className="mt-3 h-4 text-xs text-muted-foreground">
        {isPending ? t("updating") : ""}
      </p>
    </form>
  );
}
