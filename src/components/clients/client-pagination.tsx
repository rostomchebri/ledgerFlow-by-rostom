import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { buildClientsHref } from "@/lib/clients/links";
import type { ClientListQuery } from "@/lib/clients/schema";
import type { ClientListResult } from "@/lib/clients/service";
import { cn } from "@/lib/utils";

type ClientPaginationProps = {
  query: ClientListQuery;
  result: Pick<ClientListResult, "total" | "page" | "pageSize" | "pageCount">;
};

export async function ClientPagination({ query, result }: ClientPaginationProps) {
  const t = await getTranslations("clients.pagination");
  const { total, page, pageSize, pageCount } = result;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0 ? t("noClients") : t("showing", { from, to, total })}
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={buildClientsHref(query, { page: Math.max(1, page - 1) })}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
          {t("previous")}
        </Link>

        <span className="px-2 text-sm text-muted-foreground">{t("page", { page, pageCount })}</span>

        <Link
          href={buildClientsHref(query, { page: Math.min(pageCount, page + 1) })}
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= pageCount && "pointer-events-none opacity-50",
          )}
        >
          {t("next")}
          <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}
