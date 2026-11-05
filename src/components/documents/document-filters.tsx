import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, SlidersHorizontal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUS_FILTERS,
  type DocumentListQuery,
} from "@/lib/documents/schema";
import { cn } from "@/lib/utils";

export async function DocumentFilters({ query }: { query: DocumentListQuery }) {
  const t = await getTranslations("documents.filters");

  return (
    <form
      method="get"
      className="glass-card flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center"
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          name="q"
          defaultValue={query.q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="ps-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <Select
          name="category"
          defaultValue={query.category}
          aria-label={t("category")}
          className="sm:w-44"
        >
          <option value="ALL">{t("allCategories")}</option>
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </Select>

        <Select name="status" defaultValue={query.status} aria-label={t("status")} className="sm:w-36">
          {DOCUMENT_STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </Select>

        <button type="submit" className={cn(buttonVariants({ variant: "default" }))}>
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          {t("apply")}
        </button>

        <Link href="/documents" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("clear")}
        </Link>
      </div>
    </form>
  );
}
