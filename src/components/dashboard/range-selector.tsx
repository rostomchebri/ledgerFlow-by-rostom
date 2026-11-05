"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays } from "lucide-react";

import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/finance/ranges";
import { cn } from "@/lib/utils";

type RangeSelectorProps = {
  range: DashboardRange;
  labels: Record<DashboardRange, string>;
  /** Displayed before the segmented control, e.g. "Jan 1 – Nov 4, 2026". */
  periodLabel: string;
  className?: string;
};

export function RangeSelector({ range, labels, periodLabel, className }: RangeSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectRange(nextRange: DashboardRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-3 rounded-2xl p-2 transition-opacity sm:flex-row sm:items-center",
        isPending && "opacity-80",
        className,
      )}
    >
      <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        {periodLabel}
      </span>
      <div className="glass-segment flex rounded-xl p-0.5" role="group" aria-label={labels[range]}>
        {DASHBOARD_RANGES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectRange(option)}
            aria-pressed={range === option}
            className={cn(
              "whitespace-nowrap rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              range === option
                ? "border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.92)] text-foreground shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)]"
                : "border border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
