import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

import { env } from "@/lib/env";

import {
  StorageNotConfiguredError,
  StorageObjectNotFoundError,
  type GetObjectResult,
  type PutObjectInput,
  type StorageAdapter,
  type StorageObject,
} from "./types";

export type S3StorageConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
};

export function s3ConfigFromEnv(): S3StorageConfig {
  if (!env.S3_BUCKET) {
    throw new StorageNotConfiguredError(
      "S3_BUCKET must be set to enable document storage (see .env.example).",
    );
  }

  // Neon Object Storage injects AWS_* variables; a self-hosted MinIO/S3 setup
  // uses the explicit S3_* ones. Accept either so the adapter stays portable.
  return {
    endpoint: env.S3_ENDPOINT ?? env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION ?? env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  };
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404;
}

/**
 * DOC-01 — S3-compatible adapter (AWS S3, MinIO, R2, …).
 * Uploads/deletes happen server-side; DOC-03 never exposes credentials to the
 * browser.
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  async put(input: PutObjectInput): Promise<StorageObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.body as PutObjectCommandInput["Body"],
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
        Metadata: input.metadata,
      }),
    );

    return {
      key: input.key,
      contentType: input.contentType,
      size: Buffer.isBuffer(input.body)
        ? input.body.byteLength
        : input.body instanceof Uint8Array
          ? input.body.byteLength
          : undefined,
    };
  }

  async get(key: string): Promise<GetObjectResult> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );

      if (!response.Body) throw new StorageObjectNotFoundError(key);

      return {
        body: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        etag: response.ETag,
      };
    } catch (error) {
      if (isNotFound(error)) throw new StorageObjectNotFoundError(key);
      throw error;
    }
  }

  async head(key: string): Promise<StorageObject | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );

      return {
        key,
        contentType: response.ContentType,
        size: response.ContentLength,
        etag: response.ETag,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}
