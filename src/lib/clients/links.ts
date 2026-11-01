import type { ClientListQuery } from "./schema";

/**
 * Builds a `/clients` URL while preserving active filters and dropping defaults.
 * Used by the pagination and filter controls.
 */
export function buildClientsHref(
  query: Partial<ClientListQuery>,
  overrides: Partial<ClientListQuery> = {},
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (merged.q?.trim()) params.set("q", merged.q.trim());
  if (merged.status && merged.status !== "active") params.set("status", merged.status);
  if (merged.type && merged.type !== "all") params.set("type", merged.type);
  if (merged.sort && merged.sort !== "name-asc") params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize && merged.pageSize !== 20) params.set("pageSize", String(merged.pageSize));

  const search = params.toString();
  return search ? `/clients?${search}` : "/clients";
}

/** True when any filter/search parameter is active. */
export function hasActiveClientFilters(query: Partial<ClientListQuery>): boolean {
  return Boolean(
    query.q?.trim() ||
    (query.status && query.status !== "active") ||
    (query.type && query.type !== "all") ||
    (query.sort && query.sort !== "name-asc"),
  );
}
