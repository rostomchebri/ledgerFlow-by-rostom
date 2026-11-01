import type { Client } from "@prisma/client";

import { CLIENT_STATUS_LABELS, CLIENT_TYPE_LABELS } from "./schema";

export function clientTypeLabel(type: Client["type"]): string {
  return CLIENT_TYPE_LABELS[type];
}

export function clientStatusLabel(status: Client["status"]): string {
  return CLIENT_STATUS_LABELS[status];
}

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

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}

/** Short, stable human reference derived from the cuid (no extra DB column needed). */
export function clientReference(id: string): string {
  return `CL-${id.slice(-6).toUpperCase()}`;
}
