import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { recordAudit } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { toWebStream } from "@/lib/storage/stream";

import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
  type DocumentListQuery,
  type DocumentMetadataInput,
} from "./schema";

export class DocumentNotFoundError extends Error {
  constructor() {
    super("Document not found.");
    this.name = "DocumentNotFoundError";
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
  mimeType: string;
  size: number;
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
  if (input.file.size <= 0) throw new DocumentValidationError("The file is empty.");
  if (input.file.size > MAX_DOCUMENT_SIZE) {
    throw new DocumentValidationError("Files must be 25 MB or smaller.");
  }
  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(input.file.mimeType)) {
    throw new DocumentValidationError("This file type is not allowed.");
  }

  await assertClient(input.firmId, input.metadata.clientId);

  const id = randomUUID();
  const storageKey = buildStorageKey({
    firmId: input.firmId,
    category: "documents",
    id,
    filename: input.file.filename,
    clientId: input.metadata.clientId,
  });
  const storage = getStorage();

  await storage.put({
    key: storageKey,
    body: input.file.buffer,
    contentType: input.file.mimeType,
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
        description: input.metadata.description ?? null,
        category: input.metadata.category,
        tags: input.metadata.tags,
        mimeType: input.file.mimeType,
        size: input.file.size,
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
  const document = await getDocument(firmId, documentId);
  if (!document) throw new DocumentNotFoundError();

  const object = await getStorage().get(document.storageKey);
  return { document, object };
}

export async function getDocumentContent(
  firmId: string,
  documentId: string,
): Promise<{ document: NonNullable<Awaited<ReturnType<typeof getDocument>>>; body: ReadableStream<Uint8Array> }> {
  const { document, object } = await getDocumentDownload(firmId, documentId);
  return { document, body: toWebStream(object.body) };
}
