import "server-only";

import { env } from "@/lib/env";

import { S3StorageAdapter } from "./s3";
import { StorageNotConfiguredError, type StorageAdapter } from "./types";

let adapter: StorageAdapter | null = null;

/**
 * DOC-01 — process-wide storage adapter. Configuration is resolved lazily so
 * the app still boots (and non-document pages still render) when object
 * storage is not configured.
 */
export function getStorage(): StorageAdapter {
  if (adapter) return adapter;

  if (!env.S3_BUCKET) {
    throw new StorageNotConfiguredError(
      "Object storage is not configured. Set S3_BUCKET (and the related S3_* variables).",
    );
  }

  adapter = new S3StorageAdapter({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  return adapter;
}

/** Test seam / dependency injection. Pass `null` to reset the singleton. */
export function setStorage(next: StorageAdapter | null): void {
  adapter = next;
}

export { MemoryStorageAdapter } from "./memory";
export { buildStorageKey, sanitizeFilename, sanitizeSegment } from "./keys";
export { s3ConfigFromEnv, S3StorageAdapter } from "./s3";
export {
  StorageNotConfiguredError,
  StorageObjectNotFoundError,
  type GetObjectResult,
  type PutObjectInput,
  type StorageAdapter,
  type StorageObject,
} from "./types";
