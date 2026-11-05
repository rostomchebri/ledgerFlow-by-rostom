import { z } from "zod";

export const DOCUMENT_CATEGORIES = [
  "CONTRACT",
  "INVOICE",
  "RECEIPT",
  "TAX",
  "IDENTITY",
  "BANK",
  "OTHER",
] as const;

export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

/** DOC-03 — allow accounting file types only; never execute uploads. */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
] as const;

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

export const documentMetadataSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(200),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
    category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
    clientId: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((value) => {
        const source = Array.isArray(value) ? value : value ? value.split(",") : [];
        return [...new Set(source.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
          .slice(0, 12)
          .map((tag) => tag.slice(0, 40));
      }),
  })
  .strict();

export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;

export const DOCUMENT_STATUS_FILTERS = ["active", "archived", "all"] as const;

export function parseDocumentListQuery(
  params: Record<string, string | string[] | undefined>,
) {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const rawCategory = first(params.category)?.toUpperCase();
  const rawStatus = first(params.status);
  const rawPageSize = Number.parseInt(first(params.pageSize) ?? "20", 10);
  const page = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    category: DOCUMENT_CATEGORIES.includes(rawCategory as never)
      ? (rawCategory as (typeof DOCUMENT_CATEGORIES)[number])
      : ("ALL" as const),
    status: DOCUMENT_STATUS_FILTERS.includes(rawStatus as never)
      ? (rawStatus as (typeof DOCUMENT_STATUS_FILTERS)[number])
      : ("active" as const),
    clientId: first(params.clientId)?.slice(0, 64) ?? "",
    tag: (first(params.tag) ?? "").trim().toLowerCase().slice(0, 40),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: [10, 20, 50].includes(rawPageSize) ? rawPageSize : 20,
  };
}

export type DocumentListQuery = ReturnType<typeof parseDocumentListQuery>;
