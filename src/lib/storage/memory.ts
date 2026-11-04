import { Readable } from "node:stream";

import {
  StorageObjectNotFoundError,
  type GetObjectResult,
  type PutObjectInput,
  type StorageAdapter,
  type StorageObject,
  type StorageBody,
} from "./types";

async function toBuffer(body: StorageBody): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  if (typeof (body as ReadableStream<Uint8Array>).getReader === "function") {
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

type StoredObject = {
  body: Buffer;
  contentType?: string;
};

/**
 * DOC-01 — in-memory adapter for unit tests and local experiments.
 * Never use this in production: data disappears when the process exits.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly objects = new Map<string, StoredObject>();

  async put(input: PutObjectInput): Promise<StorageObject> {
    const body = await toBuffer(input.body);
    this.objects.set(input.key, { body, contentType: input.contentType });

    return {
      key: input.key,
      contentType: input.contentType,
      size: body.byteLength,
    };
  }

  async get(key: string): Promise<GetObjectResult> {
    const object = this.objects.get(key);
    if (!object) throw new StorageObjectNotFoundError(key);

    return {
      body: Readable.from([object.body]),
      contentType: object.contentType,
      contentLength: object.body.byteLength,
    };
  }

  async head(key: string): Promise<StorageObject | null> {
    const object = this.objects.get(key);
    if (!object) return null;

    return {
      key,
      contentType: object.contentType,
      size: object.body.byteLength,
    };
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
