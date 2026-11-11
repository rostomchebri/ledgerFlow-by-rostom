"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateInput, type TransactionListQuery } from "@/lib/finance/query";
import { cn } from "@/lib/utils";

type TransactionFiltersProps = {
  query: TransactionListQuery;
};

const labelClass = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function TransactionFilters({ query }: TransactionFiltersProps) {
  const t = useTranslations("transactions");
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

  function apply(nextSearch = search) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="transaction-search" className={labelClass}>
              {t("filters.search")}
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="transaction-search"
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="transaction-type" className={labelClass}>
                {t("filters.type")}
              </label>
              <Select
                id="transaction-type"
                value={query.type}
                onChange={(event) => setParam("type", event.target.value, "ALL")}
                className="h-10 min-w-32 rounded-xl"
              >
                <option value="ALL">{t("filters.allTypes")}</option>
                <option value="INCOME">{t("filters.income")}</option>
                <option value="EXPENSE">{t("filters.expense")}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="transaction-category" className={labelClass}>
                {t("filters.category")}
              </label>
              <Select
                id="transaction-category"
                value={query.category}
                onChange={(event) => setParam("category", event.target.value, "ALL")}
                className="h-10 min-w-36 rounded-xl"
              >
                <option value="ALL">{t("filters.allCategories")}</option>
                <option value="SALES">{t("categories.SALES")}</option>
                <option value="SERVICES">{t("categories.SERVICES")}</option>
                <option value="OPERATIONS">{t("categories.OPERATIONS")}</option>
                <option value="MARKETING">{t("categories.MARKETING")}</option>
                <option value="SOFTWARE">{t("categories.SOFTWARE")}</option>
                <option value="PAYROLL">{t("categories.PAYROLL")}</option>
                <option value="OTHER">{t("categories.OTHER")}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="transaction-sort" className={labelClass}>
                {t("filters.sort")}
              </label>
              <Select
                id="transaction-sort"
                value={query.sort}
                onChange={(event) => setParam("sort", event.target.value, "date-desc")}
                className="h-10 min-w-40 rounded-xl"
              >
                <option value="date-desc">{t("filters.sortDateDesc")}</option>
                <option value="date-asc">{t("filters.sortDateAsc")}</option>
                <option value="amount-desc">{t("filters.sortAmountDesc")}</option>
                <option value="amount-asc">{t("filters.sortAmountAsc")}</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="space-y-1.5">
              <label htmlFor="transaction-from" className={labelClass}>
                {t("filters.from")}
              </label>
              <Input
                id="transaction-from"
                type="date"
                value={formatDateInput(query.from)}
                max={formatDateInput(query.to) || undefined}
                onChange={(event) => setParam("from", event.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transaction-to" className={labelClass}>
                {t("filters.to")}
              </label>
              <Input
                id="transaction-to"
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
              href="/transactions"
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
