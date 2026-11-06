import "server-only";

import { S3StorageAdapter, s3ConfigFromEnv } from "./s3";
import { type StorageAdapter } from "./types";

let adapter: StorageAdapter | null = null;

/**
 * DOC-01 — process-wide storage adapter. Configuration is resolved lazily so
 * the app still boots (and non-document pages still render) when object
 * storage is not configured.
 *
 * `s3ConfigFromEnv` owns the `S3_*` → Neon `AWS_*` fallback; keeping a single
 * configuration path prevents the two entry points from disagreeing.
 */
export function getStorage(): StorageAdapter {
  if (adapter) return adapter;
  adapter = new S3StorageAdapter(s3ConfigFromEnv());
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
