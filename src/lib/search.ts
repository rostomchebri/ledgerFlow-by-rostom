import type { ClientStatus, InvoiceStatus, TaskStatus, TransactionType } from "@prisma/client";

/**
 * Shared contract between the search API and the command palette.
 *
 * This module stays free of server-only imports so the client bundle can use
 * the same limits and result shapes without pulling in Prisma.
 */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;
export const SEARCH_RESULT_LIMIT = 5;

export type SearchClient = {
  id: string;
  name: string;
  email: string | null;
  status: ClientStatus;
  href: string;
};

export type SearchInvoice = {
  id: string;
  number: string;
  clientName: string;
  total: number;
  status: InvoiceStatus;
  href: string;
};

export type SearchTransaction = {
  id: string;
  description: string;
  clientName: string | null;
  amount: number;
  type: TransactionType;
  occurredAt: string;
  href: string;
};

export type SearchTask = {
  id: string;
  title: string;
  clientName: string | null;
  status: TaskStatus;
  dueDate: string | null;
  href: string;
};

export type SearchResults = {
  clients: SearchClient[];
  invoices: SearchInvoice[];
  transactions: SearchTransaction[];
  tasks: SearchTask[];
};

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  clients: [],
  invoices: [],
  transactions: [],
  tasks: [],
};

/** Trims, bounds and rejects searches that are too short to be useful. */
export function normalizeSearchTerm(value: string | null | undefined): string | null {
  const term = (value ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  return term.length >= SEARCH_MIN_LENGTH ? term : null;
}
