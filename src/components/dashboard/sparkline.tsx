import { cn } from "@/lib/utils";

type SparklineProps = {
  values: number[];
  tone?: "blue" | "rose" | "emerald" | "purple";
  className?: string;
};

const TONE_COLORS: Record<NonNullable<SparklineProps["tone"]>, string> = {
  blue: "hsl(var(--chart-1))",
  rose: "hsl(var(--destructive))",
  emerald: "hsl(var(--success))",
  purple: "hsl(var(--chart-4))",
};

/**
 * A tiny decorative trend line for KPI cards. It is intentionally not
 * interactive: the real chart below carries the accessible data.
 */
export function Sparkline({ values, tone = "blue", className }: SparklineProps) {
  const width = 96;
  const height = 34;
  const max = Math.max(1, ...values);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => ({
    x: values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: height - 4 - ((value - min) / span) * (height - 8),
  }));

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = points.length
    ? `${line} L ${points.at(-1)!.x} ${height} L ${points[0]!.x} ${height} Z`
    : "";
  const color = TONE_COLORS[tone];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={cn("h-9 w-24 overflow-visible", className)}
    >
      <path d={area} fill={color} opacity="0.1" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 ? (
        <circle
          cx={points.at(-1)!.x}
          cy={points.at(-1)!.y}
          r="2.5"
          fill="hsl(var(--card))"
          stroke={color}
          strokeWidth="2"
        />
      ) : null}
    </svg>
  );
}
