"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TransactionListQuery } from "@/lib/finance/service";
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

  function apply(nextSearch = search) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    else params.delete("q");
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className={cn("glass-card rounded-2xl p-4 transition-opacity", isPending && "opacity-70")}
    >
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

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="space-y-1.5">
            <label htmlFor="transaction-type" className={labelClass}>
              {t("filters.type")}
            </label>
            <Select
              id="transaction-type"
              value={query.type}
              onChange={(event) => {
                const params = new URLSearchParams(searchParams.toString());
                if (event.target.value === "ALL") params.delete("type");
                else params.set("type", event.target.value);
                params.delete("page");
                startTransition(() =>
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
                );
              }}
              className="h-10 min-w-36 rounded-xl"
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
              onChange={(event) => {
                const params = new URLSearchParams(searchParams.toString());
                if (event.target.value === "ALL") params.delete("category");
                else params.set("category", event.target.value);
                params.delete("page");
                startTransition(() =>
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
                );
              }}
              className="h-10 min-w-40 rounded-xl"
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
    </form>
  );
}
