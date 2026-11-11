import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Small uppercase context label, e.g. "Financial overview". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary actions rendered on the trailing edge on wide screens. */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Shared page masthead. Centralising the eyebrow/heading/description rhythm
 * keeps every module visually aligned and makes future typography changes a
 * one-file edit instead of a page-by-page sweep.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-gradient text-[30px] font-bold leading-tight tracking-[-0.04em] sm:text-[34px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
