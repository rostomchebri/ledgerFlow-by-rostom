import { Readable } from "node:stream";

/**
 * Normalises an S3/MinIO body (Node `Readable`) to a Web stream so route
 * handlers can pass it straight to `new Response(...)` (DOC-05).
 */
export function toWebStream(
  body: Readable | ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  if (typeof (body as ReadableStream<Uint8Array>).getReader === "function") {
    return body as ReadableStream<Uint8Array>;
  }

  return Readable.toWeb(body as Readable) as ReadableStream<Uint8Array>;
}
