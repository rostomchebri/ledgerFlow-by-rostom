import { sanitizeFilename } from "@/lib/storage/keys";

import { ALLOWED_DOCUMENT_TYPES } from "./schema";

/**
 * DOC-05 — filename/MIME helpers shared by the upload and download routes.
 *
 * These are intentionally pure so the edge cases (missing extension, unicode
 * names, header injection, browsers that report an empty MIME type) can be
 * covered by unit tests without touching Prisma or S3.
 */

const ALLOWED_TYPES = new Set<string>(ALLOWED_DOCUMENT_TYPES);

/** Preferred MIME type for each extension we accept. */
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  txt: "text/plain",
  csv: "text/csv",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
};

/** Extension used when a stored document has none (e.g. a renamed display name). */
const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/csv": "csv",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/zip": "zip",
};

export function extensionOf(filename: string): string {
  const basename = filename.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = basename.lastIndexOf(".");
  if (dot <= 0 || dot === basename.length - 1) return "";
  return basename.slice(dot + 1).toLowerCase();
}

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  return ALLOWED_TYPES.has(mimeType.toLowerCase());
}

/**
 * The DB copy of the upload name. Unlike the storage key it keeps unicode and
 * the original extension; only path segments and control characters are
 * removed so the name is safe to store and echo back in a header.
 */
export function normalizeOriginalFilename(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? "document";
  const cleaned = base
    .replace(/[\r\n\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);

  return cleaned || "document";
}

/**
 * Prefer the browser-reported MIME type, but fall back to the extension when
 * the browser sends an empty type or the generic `application/octet-stream`
 * (common for CSV/Office files on Windows).
 */
export function resolveMimeType(reported: string | undefined, filename: string): string | null {
  const normalized = (reported ?? "").trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream" && isAllowedDocumentMimeType(normalized)) {
    return normalized;
  }

  const fromExtension = MIME_BY_EXTENSION[extensionOf(filename)];
  return fromExtension && isAllowedDocumentMimeType(fromExtension) ? fromExtension : null;
}

function hasExtension(filename: string): boolean {
  return extensionOf(filename) !== "";
}

function withExtension(filename: string, mimeType: string): string {
  if (hasExtension(filename)) return filename;
  const extension = EXTENSION_BY_MIME[mimeType.toLowerCase()];
  return extension ? `${filename}.${extension}` : filename;
}

/**
 * The name sent in `Content-Disposition`. Prefer the original upload name so
 * the user gets exactly the file they uploaded; older rows fall back to the
 * display name, and a known MIME type restores a missing extension.
 */
export function resolveDocumentFilename(document: {
  name: string;
  originalFilename?: string | null;
  mimeType: string;
}): string {
  const base =
    document.originalFilename?.trim() ||
    document.name.trim() ||
    "document";
  return withExtension(base, document.mimeType);
}

/** RFC 6266 / 5987 safe `Content-Disposition` value. */
export function contentDisposition(
  disposition: "inline" | "attachment",
  filename: string,
): string {
  const safeName = filename.replace(/[\r\n\u0000-\u001f\u007f]/g, "").trim() || "document";
  const fallback =
    safeName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_")
      .slice(0, 120) || "document";

  // encodeURIComponent leaves a few characters that are not valid attr-char.
  const encoded = encodeURIComponent(safeName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/** Used by the upload route so a display name and key stay path-safe. */
export function safeStorageFilename(filename: string): string {
  return sanitizeFilename(filename);
}
