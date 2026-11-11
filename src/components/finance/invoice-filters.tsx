"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateInput } from "@/lib/finance/query";
import type { InvoiceListQuery } from "@/lib/invoices/service";
import { cn } from "@/lib/utils";

type InvoiceFiltersProps = {
  query: InvoiceListQuery;
};

const labelClass = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function InvoiceFilters({ query }: InvoiceFiltersProps) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);

  function navigate(params: URLSearchParams) {
    params.delete("page");
    const suffix = params.toString();
    startTransition(() =>
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false }),
    );
  }

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set("q", search.trim());
    else params.delete("q");
    navigate(params);
  }

  function setParam(key: string, value: string, emptyValue = "") {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== emptyValue) params.set(key, value);
    else params.delete(key);
    navigate(params);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className={cn("glass-card rounded-2xl p-4 transition-opacity", isPending && "opacity-70")}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="invoice-search" className={labelClass}>
              {t("filters.search")}
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="invoice-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="h-10 rounded-xl ps-9"
                autoComplete="off"
                maxLength={120}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="invoice-status" className={labelClass}>
                {t("filters.status")}
              </label>
              <Select
                id="invoice-status"
                value={query.status}
                onChange={(event) => setParam("status", event.target.value, "ALL")}
                className="h-10 min-w-40 rounded-xl"
              >
                <option value="ALL">{t("filters.all")}</option>
                <option value="DRAFT">{t("statuses.DRAFT")}</option>
                <option value="SENT">{t("statuses.SENT")}</option>
                <option value="PAID">{t("statuses.PAID")}</option>
                <option value="OVERDUE">{t("statuses.OVERDUE")}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invoice-sort" className={labelClass}>
                {t("filters.sort")}
              </label>
              <Select
                id="invoice-sort"
                value={query.sort}
                onChange={(event) => setParam("sort", event.target.value, "issue-desc")}
                className="h-10 min-w-44 rounded-xl"
              >
                <option value="issue-desc">{t("filters.sortIssueDesc")}</option>
                <option value="issue-asc">{t("filters.sortIssueAsc")}</option>
                <option value="due-asc">{t("filters.sortDueAsc")}</option>
                <option value="amount-desc">{t("filters.sortAmountDesc")}</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="space-y-1.5">
              <label htmlFor="invoice-from" className={labelClass}>
                {t("filters.from")}
              </label>
              <Input
                id="invoice-from"
                type="date"
                value={formatDateInput(query.from)}
                max={formatDateInput(query.to) || undefined}
                onChange={(event) => setParam("from", event.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invoice-to" className={labelClass}>
                {t("filters.to")}
              </label>
              <Input
                id="invoice-to"
                type="date"
                value={formatDateInput(query.to)}
                min={formatDateInput(query.from) || undefined}
                onChange={(event) => setParam("to", event.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" className="h-10 rounded-xl">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              {t("filters.apply")}
            </Button>
            <Link
              href="/invoices"
              className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("filters.clear")}
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
