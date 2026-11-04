/**
 * DOC-01 — deterministic, path-safe object keys.
 *
 * Keys are never taken from user input directly: a generated id plus a
 * sanitised filename keeps uploads inside `firm/<firmId>/...` and prevents
 * traversal (`..`, absolute paths, backslashes).
 */

const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]+/g;
const UNSAFE_SEGMENT_CHARS = /[^a-zA-Z0-9_-]+/g;

export function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/\\/g, "/").split("/").pop() ?? "file";

  const safe = basename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return safe || "file";
}

export function sanitizeSegment(value: string): string {
  const safe = value
    .replace(UNSAFE_SEGMENT_CHARS, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return safe || "unknown";
}

export type StorageKeyInput = {
  firmId: string;
  category: string;
  id: string;
  filename: string;
  clientId?: string;
};

/** Example: `firm/cm123/documents/clients/cm456/doc789-invoice.pdf`. */
export function buildStorageKey(input: StorageKeyInput): string {
  const parts = ["firm", sanitizeSegment(input.firmId), sanitizeSegment(input.category)];

  if (input.clientId) {
    parts.push("clients", sanitizeSegment(input.clientId));
  }

  parts.push(`${sanitizeSegment(input.id)}-${sanitizeFilename(input.filename)}`);

  return parts.join("/");
}
