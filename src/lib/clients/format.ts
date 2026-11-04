import type { Client } from "@prisma/client";

/** Returns the two-letter monogram shown in the list/detail avatar. */
export function clientInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2);

  if (words.length === 0) return "?";
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

/** Joins the address parts that are present into a single readable line. */
export function formatClientAddress(
  client: Pick<Client, "addressLine1" | "addressLine2" | "postalCode" | "city" | "country">,
): string {
  const locality = [client.postalCode, client.city].filter(Boolean).join(" ");
  return [client.addressLine1, client.addressLine2, locality, client.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}

const DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(locale: string): Intl.DateTimeFormat {
  const cached = DATE_FORMATTERS.get(locale);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  DATE_FORMATTERS.set(locale, formatter);
  return formatter;
}

export function formatDate(value: Date | string | null | undefined, locale = "en-GB"): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return getDateFormatter(locale).format(date);
}

/** Short, stable human reference. Uses the stored reference when present. */
export function clientReference(id: string, reference?: string | null): string {
  const stored = reference?.trim();
  if (stored) return stored;
  return `CL-${id.slice(-6).toUpperCase()}`;
}
