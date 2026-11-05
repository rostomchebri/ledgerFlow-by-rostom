import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";

export type KpiTone = "blue" | "rose" | "emerald" | "purple";

type KpiCardProps = {
  label: string;
  value: string;
  changeLabel: string;
  comparisonLabel: string;
  change: number | null;
  trend: number[];
  icon: LucideIcon;
  tone: KpiTone;
  positiveIsGood?: boolean;
};

const TONE_STYLES: Record<KpiTone, { tile: string; spark: KpiTone }> = {
  blue: {
    tile: "border-blue-500/15 bg-gradient-to-br from-blue-500/18 to-blue-500/[0.04] text-blue-600 dark:text-blue-300",
    spark: "blue",
  },
  rose: {
    tile: "border-rose-500/15 bg-gradient-to-br from-rose-500/18 to-rose-500/[0.04] text-rose-600 dark:text-rose-300",
    spark: "rose",
  },
  emerald: {
    tile: "border-emerald-500/15 bg-gradient-to-br from-emerald-500/18 to-emerald-500/[0.04] text-emerald-600 dark:text-emerald-300",
    spark: "emerald",
  },
  purple: {
    tile: "border-violet-500/15 bg-gradient-to-br from-violet-500/18 to-violet-500/[0.04] text-violet-600 dark:text-violet-300",
    spark: "purple",
  },
};

export function KpiCard({
  label,
  value,
  changeLabel,
  comparisonLabel,
  change,
  trend,
  icon: Icon,
  tone,
  positiveIsGood = true,
}: KpiCardProps) {
  const isFlat = change === null || change === 0;
  const isUp = (change ?? 0) > 0;
  const isGood = isFlat ? null : isUp === positiveIsGood;
  const styles = TONE_STYLES[tone];

  return (
    <div className="glass-card glass-card-hover group overflow-hidden rounded-2xl p-5 hover:-translate-y-0.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-10 -top-12 h-28 w-28 rounded-full bg-primary/[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]",
            styles.tile,
          )}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold tabular-nums backdrop-blur-md",
            isFlat
              ? "border-[hsl(var(--border)/0.7)] bg-muted/60 text-muted-foreground"
              : isGood
                ? "border-emerald-600/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-rose-600/15 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}
        >
          {isFlat ? (
            <Minus aria-hidden="true" className="h-3 w-3" />
          ) : isUp ? (
            <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
          ) : (
            <ArrowDownRight aria-hidden="true" className="h-3 w-3" />
          )}
          {changeLabel}
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-[27px] font-bold tabular-nums leading-tight tracking-[-0.03em]">
          {value}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[11px] leading-4 text-muted-foreground">{comparisonLabel}</p>
        <Sparkline values={trend} tone={styles.spark} className="shrink-0" />
      </div>
    </div>
  );
}
