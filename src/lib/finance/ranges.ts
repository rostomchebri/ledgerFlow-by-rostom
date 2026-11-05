/**
 * Period helpers shared by the dashboard, reports and list filters.
 *
 * Ranges are URL-driven (`?range=month`) so every view stays a server component:
 * the URL is the single source of truth for what the user is looking at.
 */
export const DASHBOARD_RANGES = ["month", "last-month", "year"] as const;

export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export function parseDashboardRange(
  value: string | string[] | undefined,
  fallback: DashboardRange = "year",
): DashboardRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return DASHBOARD_RANGES.includes(candidate as DashboardRange)
    ? (candidate as DashboardRange)
    : fallback;
}

export type PeriodWindow = {
  /** Inclusive start of the selected period. */
  start: Date;
  /** Exclusive end of the selected period. */
  end: Date;
  /** Inclusive start of the comparison period. */
  previousStart: Date;
  /** Exclusive end of the comparison period. */
  previousEnd: Date;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function resolvePeriod(range: DashboardRange, now = new Date()): PeriodWindow {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (range === "month") {
    return {
      start: new Date(year, month, 1),
      end: endOfDay(now),
      previousStart: new Date(year, month - 1, 1),
      previousEnd: new Date(year, month, 1),
    };
  }

  if (range === "last-month") {
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 1),
      previousStart: new Date(year, month - 2, 1),
      previousEnd: new Date(year, month - 1, 1),
    };
  }

  return {
    start: new Date(year, 0, 1),
    end: endOfDay(now),
    previousStart: new Date(year - 1, 0, 1),
    previousEnd: new Date(year - 1, now.getMonth(), now.getDate() + 1),
  };
}

export type PeriodBucket = { start: Date; end: Date };

/** Splits a window into monthly buckets (year) or weekly buckets (months). */
export function buildBuckets(range: DashboardRange, window: PeriodWindow): PeriodBucket[] {
  if (range === "year") {
    return Array.from({ length: 12 }, (_, index) => ({
      start: new Date(window.start.getFullYear(), index, 1),
      end: new Date(window.start.getFullYear(), index + 1, 1),
    }));
  }

  const buckets: PeriodBucket[] = [];
  const cursor = startOfDay(new Date(window.start));
  const last = endOfDay(new Date(window.end));
  let guard = 0;

  while (cursor < last && guard < 6) {
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + 7);
    buckets.push({ start: new Date(cursor), end: bucketEnd });
    cursor.setDate(cursor.getDate() + 7);
    guard += 1;
  }

  return buckets;
}
