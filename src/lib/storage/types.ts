import type { Readable } from "node:stream";

/**
 * DOC-01 — storage abstraction.
 *
 * The rest of the application depends on this interface only. DOC-03/05 use it
 * to upload, stream and delete documents without knowing whether the bytes
 * live in MinIO, AWS S3 or an in-memory adapter used by tests.
 */

export type StorageBody = Buffer | Uint8Array | Readable | ReadableStream<Uint8Array>;

export type PutObjectInput = {
  key: string;
  body: StorageBody;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
};

export type StorageObject = {
  key: string;
  contentType?: string;
  size?: number;
  etag?: string;
};

export type GetObjectResult = {
  body: Readable | ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: number;
  etag?: string;
};

export interface StorageAdapter {
  put(input: PutObjectInput): Promise<StorageObject>;
  get(key: string): Promise<GetObjectResult>;
  head(key: string): Promise<StorageObject | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

export class StorageNotConfiguredError extends Error {
  constructor(message = "Object storage is not configured.") {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}

export class StorageObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Storage object not found: ${key}`);
    this.name = "StorageObjectNotFoundError";
  }
}
