/**
 * Human-friendly, stable workspace slugs.
 *
 * Slugs are generated once at firm creation; changing a firm name never
 * changes the slug (shared links stay valid). Arabic and other non-Latin names
 * fall back to `firm` because the MVP deliberately keeps slugs ASCII-only.
 */
export function slugifyFirmName(name: string): string {
  const ascii = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return slug || "firm";
}

/** Adds a numeric suffix while keeping the 48-character column limit. */
export function suffixedSlug(base: string, suffix: number): string {
  const tail = `-${suffix}`;
  return `${base.slice(0, 48 - tail.length)}${tail}`;
}
