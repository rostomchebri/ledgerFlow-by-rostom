import { formatCurrency, formatNumber } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  slices: DonutSlice[];
  total: number;
  locale: string;
  centerLabel: string;
  emptyLabel: string;
  className?: string;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({
  slices,
  total,
  locale,
  centerLabel,
  emptyLabel,
  className,
}: DonutChartProps) {
  const nonEmpty = slices.filter((slice) => slice.value > 0);
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-6 sm:flex-row sm:items-center", className)}>
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="16"
          />
          {nonEmpty.map((slice) => {
            const fraction = total > 0 ? slice.value / total : 0;
            const dash = fraction * CIRCUMFERENCE;
            const circle = (
              <circle
                key={slice.key}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium text-muted-foreground">{centerLabel}</span>
          <span className="mt-0.5 max-w-24 truncate text-sm font-bold tabular-nums">
            {formatCurrency(total, locale, true)}
          </span>
        </div>
      </div>

      {nonEmpty.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex w-full min-w-0 flex-col gap-2.5">
          {nonEmpty.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{slice.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatNumber(Math.round(total > 0 ? (slice.value / total) * 100 : 0), locale)}%
              </span>
              <span className="hidden w-24 shrink-0 text-end text-xs tabular-nums text-muted-foreground sm:block">
                {formatCurrency(slice.value, locale, true)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
