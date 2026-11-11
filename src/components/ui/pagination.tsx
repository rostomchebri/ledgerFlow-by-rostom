import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationBarProps = {
  /** Pre-formatted "showing x–y of z" label. */
  summary: string;
  page: number;
  pageCount: number;
  previousHref: string | null;
  nextHref: string | null;
  previousLabel: string;
  nextLabel: string;
};

/**
 * Shared list pagination. Links stay real anchors so pagination remains
 * bookmarkable, shareable and server-rendered.
 */
export function PaginationBar({
  summary,
  page,
  pageCount,
  previousHref,
  nextHref,
  previousLabel,
  nextLabel,
}: PaginationBarProps) {
  const disabledClass =
    buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-40";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">{summary}</p>
      {/* The summary doubles as the landmark name: it is already localized and
          tells screen-reader users which window of results they are in. */}
      <nav className="flex items-center gap-2" aria-label={summary}>
        {previousHref ? (
          <Link href={previousHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {previousLabel}
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            {previousLabel}
          </span>
        )}
        <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
          {page} / {pageCount}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {nextLabel}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            {nextLabel}
          </span>
        )}
      </nav>
    </div>
  );
}
