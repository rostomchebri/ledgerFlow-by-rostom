import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "blue" | "rose" | "emerald" | "purple" | "orange";

const TONE_STYLES: Record<StatTone, string> = {
  blue: "border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  rose: "border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  purple: "border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  orange: "border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-300",
};

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Optional secondary line, e.g. an invoice count. */
  hint?: string;
  className?: string;
};

/**
 * Compact KPI tile used by list pages. The dashboard keeps its richer
 * `KpiCard` (sparkline + change); this is the shared, calmer variant for
 * module summaries.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "glass-card glass-card-hover flex items-center gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
          TONE_STYLES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold tabular-nums tracking-[-0.025em]">
          {value}
        </p>
        {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
