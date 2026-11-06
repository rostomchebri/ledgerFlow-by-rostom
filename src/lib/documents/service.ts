import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { recordAudit } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { getStorage, buildStorageKey, StorageObjectNotFoundError } from "@/lib/storage";
import { toWebStream } from "@/lib/storage/stream";

import { normalizeOriginalFilename, resolveMimeType } from "./file";
import { MAX_DOCUMENT_SIZE, type DocumentListQuery, type DocumentMetadataInput } from "./schema";

export class DocumentNotFoundError extends Error {
  constructor() {
    super("Document not found.");
    this.name = "DocumentNotFoundError";
  }
}

/** The row exists but the object is missing from object storage. */
export class DocumentContentUnavailableError extends Error {
  constructor() {
    super("The stored file could not be found.");
    this.name = "DocumentContentUnavailableError";
  }
}

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export type UploadFileInput = {
  buffer: Buffer;
  filename: string;
  /** Browser-reported type; may be empty or `application/octet-stream`. */
  mimeType?: string;
};

function documentWhere(firmId: string, query: DocumentListQuery): Prisma.DocumentWhereInput {
  return {
    firmId,
    ...(query.status === "active"
      ? { deletedAt: null }
      : query.status === "archived"
        ? { deletedAt: { not: null } }
        : {}),
    ...(query.category !== "ALL" ? { category: query.category } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { client: { name: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listDocuments(firmId: string, query: DocumentListQuery) {
  const where = documentWhere(firmId, query);

  const [items, total, tagRows] = await Promise.all([
    db.document.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.document.count({ where }),
    db.document.findMany({
      where: { firmId, deletedAt: null },
      select: { tags: true },
      take: 500,
    }),
  ]);

  const tags = [...new Set(tagRows.flatMap((row) => row.tags))].sort();

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    tags,
  };
}

export async function getDocument(firmId: string, documentId: string) {
  return db.document.findFirst({
    where: { id: documentId, firmId },
    include: {
      client: { select: { id: true, name: true } },
      uploadedBy: { select: { name: true, email: true } },
    },
  });
}

async function assertClient(firmId: string, clientId: string | undefined) {
  if (!clientId) return;
  const client = await db.client.findFirst({
    where: { id: clientId, firmId },
    select: { id: true },
  });
  if (!client) throw new DocumentValidationError("The selected client does not belong to this firm.");
}

export async function uploadDocument(input: {
  firmId: string;
  actorId: string;
  metadata: DocumentMetadataInput;
  file: UploadFileInput;
}) {
  // Never trust a client-supplied size: the buffer we actually received is the
  // authoritative length for both validation and the `content-length` header.
  const size = input.file.buffer.byteLength;
  if (size <= 0) throw new DocumentValidationError("The file is empty.");
  if (size > MAX_DOCUMENT_SIZE) {
    throw new DocumentValidationError("Files must be 25 MB or smaller.");
  }

  const mimeType = resolveMimeType(input.file.mimeType, input.file.filename);
  if (!mimeType) {
    throw new DocumentValidationError("This file type is not allowed.");
  }

  const originalFilename = normalizeOriginalFilename(input.file.filename);
  await assertClient(input.firmId, input.metadata.clientId);

  const id = randomUUID();
  const storageKey = buildStorageKey({
    firmId: input.firmId,
    category: "documents",
    id,
    filename: originalFilename,
    clientId: input.metadata.clientId,
  });
  const storage = getStorage();

  await storage.put({
    key: storageKey,
    body: input.file.buffer,
    contentType: mimeType,
    metadata: { firmId: input.firmId, documentId: id },
  });

  try {
    const document = await db.document.create({
      data: {
        id,
        firmId: input.firmId,
        clientId: input.metadata.clientId ?? null,
        uploadedById: input.actorId,
        name: input.metadata.name,
        originalFilename,
        description: input.metadata.description ?? null,
        category: input.metadata.category,
        tags: input.metadata.tags,
        mimeType,
        size,
        storageKey,
      },
    });

    await recordAudit({
      firmId: input.firmId,
      actorId: input.actorId,
      action: "document.uploaded",
      entityType: "document",
      entityId: document.id,
      metadata: { name: document.name, category: document.category, size: document.size },
    });

    return document;
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function setDocumentDeleted(input: {
  firmId: string;
  documentId: string;
  actorId: string;
  deleted: boolean;
}) {
  const existing = await db.document.findFirst({
    where: { id: input.documentId, firmId: input.firmId },
  });
  if (!existing) throw new DocumentNotFoundError();

  const document = await db.document.update({
    where: { id: existing.id },
    data: { deletedAt: input.deleted ? new Date() : null },
  });

  await recordAudit({
    firmId: input.firmId,
    actorId: input.actorId,
    action: input.deleted ? "document.deleted" : "document.restored",
    entityType: "document",
    entityId: document.id,
    metadata: { name: document.name },
  });

  return document;
}

export async function getDocumentDownload(firmId: string, documentId: string) {
  // The tenant scope is enforced by `getDocument`, so a document that belongs
  // to another firm is indistinguishable from a missing one.
  const document = await getDocument(firmId, documentId);
  if (!document) throw new DocumentNotFoundError();

  try {
    const object = await getStorage().get(document.storageKey);
    return { document, object };
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new DocumentContentUnavailableError();
    }
    throw error;
  }
}

export async function getDocumentContent(
  firmId: string,
  documentId: string,
): Promise<{
  document: NonNullable<Awaited<ReturnType<typeof getDocument>>>;
  body: ReadableStream<Uint8Array>;
  contentLength?: number;
}> {
  const { document, object } = await getDocumentDownload(firmId, documentId);
  return {
    document,
    body: toWebStream(object.body),
    contentLength: object.contentLength,
  };
}
