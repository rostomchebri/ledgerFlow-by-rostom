const CURRENCY = "DZD";

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();
const COMPACT_FORMATTERS = new Map<string, Intl.NumberFormat>();
const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();

function getFormatter(
  cache: Map<string, Intl.NumberFormat>,
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const formatter = new Intl.NumberFormat(locale, options);
  cache.set(key, formatter);
  return formatter;
}

/** Full currency value — e.g. 1 240 000 DA. */
export function formatCurrency(value: number, locale = "fr", compact = false): string {
  const formatter = compact
    ? getFormatter(COMPACT_FORMATTERS, locale, {
        style: "currency",
        currency: CURRENCY,
        notation: "compact",
        maximumFractionDigits: 1,
      })
    : getFormatter(CURRENCY_FORMATTERS, locale, {
        style: "currency",
        currency: CURRENCY,
        maximumFractionDigits: 0,
      });

  return formatter.format(value);
}

/** Alias used by axis labels, where a compact value keeps the chart readable. */
export function formatCompactCurrency(value: number, locale = "fr"): string {
  return formatCurrency(value, locale, true);
}

export function formatNumber(value: number, locale = "fr"): string {
  return getFormatter(NUMBER_FORMATTERS, locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

/** Percentage change between two periods. Returns null when there is no base. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatPercentChange(value: number | null, locale = "fr"): string {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(value);
  return `${formatted}%`;
}
