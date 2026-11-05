"use client";

import { useId, useState } from "react";

import { formatCompactCurrency, formatCurrency } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

export type AreaChartPoint = {
  label: string;
  revenue: number;
  expenses: number;
};

type AreaChartProps = {
  data: AreaChartPoint[];
  locale: string;
  ariaLabel: string;
  revenueLabel: string;
  expensesLabel: string;
  className?: string;
};

const WIDTH = 760;
const HEIGHT = 280;
const PADDING = { top: 18, right: 14, bottom: 34, left: 62 };

function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1]!;
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

export function AreaChart({
  data,
  locale,
  ariaLabel,
  revenueLabel,
  expensesLabel,
  className,
}: AreaChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(1, ...data.map((point) => Math.max(point.revenue, point.expenses)));
  const roundedMax = Math.ceil(maxValue / 100_000) * 100_000;

  const xFor = (index: number) =>
    PADDING.left + (data.length <= 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
  const yFor = (value: number) => PADDING.top + innerHeight - (value / roundedMax) * innerHeight;

  const revenuePoints = data.map((point, index) => ({
    x: xFor(index),
    y: yFor(point.revenue),
  }));
  const expensePoints = data.map((point, index) => ({
    x: xFor(index),
    y: yFor(point.expenses),
  }));

  const revenueLine = linePath(revenuePoints);
  const expenseLine = linePath(expensePoints);
  const baseline = PADDING.top + innerHeight;

  const revenueArea =
    revenuePoints.length > 0
      ? `${revenueLine} L ${revenuePoints.at(-1)!.x} ${baseline} L ${revenuePoints[0]!.x} ${baseline} Z`
      : "";
  const expenseArea =
    expensePoints.length > 0
      ? `${expenseLine} L ${expensePoints.at(-1)!.x} ${baseline} L ${expensePoints[0]!.x} ${baseline} Z`
      : "";

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = (roundedMax / 4) * index;
    return { value, y: yFor(value) };
  });

  const active = hovered !== null ? data[hovered] : null;
  const activeX = hovered !== null ? xFor(hovered) : 0;

  return (
    <div className={cn("relative w-full", className)} dir="ltr">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`revenue-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.24" />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`expenses-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((line) => (
          <g key={line.value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={line.y}
              y2={line.y}
              stroke="hsl(var(--border))"
              strokeDasharray="3 5"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 10}
              y={line.y + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
              style={{ fontSize: 10 }}
            >
              {formatCompactCurrency(line.value, locale)}
            </text>
          </g>
        ))}

        <path d={revenueArea} fill={`url(#revenue-${gradientId})`} />
        <path d={expenseArea} fill={`url(#expenses-${gradientId})`} />

        <path
          d={expenseLine}
          fill="none"
          stroke="hsl(var(--chart-2))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={revenueLine}
          fill="none"
          stroke="hsl(var(--chart-1))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => (
          <text
            key={`${point.label}-${index}`}
            x={xFor(index)}
            y={HEIGHT - 10}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10.5 }}
          >
            {point.label}
          </text>
        ))}

        {hovered !== null ? (
          <g>
            <line
              x1={activeX}
              x2={activeX}
              y1={PADDING.top}
              y2={baseline}
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
            />
            <circle
              cx={activeX}
              cy={revenuePoints[hovered]!.y}
              r="5"
              fill="hsl(var(--card))"
              stroke="hsl(var(--chart-1))"
              strokeWidth="3"
            />
            <circle
              cx={activeX}
              cy={expensePoints[hovered]!.y}
              r="4.5"
              fill="hsl(var(--card))"
              stroke="hsl(var(--chart-2))"
              strokeWidth="2.5"
            />
          </g>
        ) : null}

        {data.map((point, index) => {
          const width = data.length <= 1 ? innerWidth : innerWidth / data.length;
          return (
            <rect
              key={`hit-${point.label}-${index}`}
              x={xFor(index) - width / 2}
              y={PADDING.top}
              width={width}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-label={`${point.label}: ${revenueLabel} ${formatCurrency(point.revenue, locale)}, ${expensesLabel} ${formatCurrency(point.expenses, locale)}`}
              className="cursor-crosshair outline-none"
            />
          );
        })}
      </svg>

      {active && hovered !== null ? (
        <div
          className="glass-soft pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl px-3 py-2 text-xs shadow-popover"
          style={{ left: `${(activeX / WIDTH) * 100}%` }}
        >
          <p className="mb-1 font-semibold">{active.label}</p>
          <p className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-chart-1" />
              {revenueLabel}
            </span>
            <span className="font-semibold">{formatCurrency(active.revenue, locale)}</span>
          </p>
          <p className="mt-0.5 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-chart-2" />
              {expensesLabel}
            </span>
            <span className="font-semibold">{formatCurrency(active.expenses, locale)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
