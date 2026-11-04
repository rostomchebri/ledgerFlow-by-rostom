import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { MemoryStorageAdapter } from "@/lib/storage/memory";
import { StorageObjectNotFoundError } from "@/lib/storage/types";

async function readBody(body: Readable | ReadableStream<Uint8Array>): Promise<string> {
  if (typeof (body as ReadableStream<Uint8Array>).getReader === "function") {
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    return Buffer.concat(chunks).toString("utf8");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

describe("MemoryStorageAdapter", () => {
  it("stores, heads and reads a buffer", async () => {
    const storage = new MemoryStorageAdapter();
    const body = Buffer.from("hello ledgerflow");

    const stored = await storage.put({
      key: "firm/f1/documents/doc_1-a.txt",
      body,
      contentType: "text/plain",
    });

    expect(stored).toMatchObject({
      key: "firm/f1/documents/doc_1-a.txt",
      contentType: "text/plain",
      size: body.byteLength,
    });

    expect(await storage.exists(stored.key)).toBe(true);
    expect(await storage.head(stored.key)).toMatchObject({
      key: stored.key,
      size: body.byteLength,
    });

    const object = await storage.get(stored.key);
    expect(object.contentType).toBe("text/plain");
    expect(object.contentLength).toBe(body.byteLength);
    expect(await readBody(object.body)).toBe("hello ledgerflow");
  });

  it("accepts Node streams and web streams", async () => {
    const storage = new MemoryStorageAdapter();

    await storage.put({
      key: "node-stream",
      body: Readable.from([Buffer.from("node "), Buffer.from("stream")]),
    });

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("web stream"));
        controller.close();
      },
    });

    await storage.put({ key: "web-stream", body: webStream });

    expect(await readBody((await storage.get("node-stream")).body)).toBe("node stream");
    expect(await readBody((await storage.get("web-stream")).body)).toBe("web stream");
  });

  it("returns null and false for unknown keys", async () => {
    const storage = new MemoryStorageAdapter();

    expect(await storage.head("missing")).toBeNull();
    expect(await storage.exists("missing")).toBe(false);
  });

  it("throws a typed error when reading an unknown key", async () => {
    const storage = new MemoryStorageAdapter();

    await expect(storage.get("missing")).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it("deletes objects and treats repeated deletes as no-ops", async () => {
    const storage = new MemoryStorageAdapter();

    await storage.put({ key: "temp", body: Buffer.from("x") });
    await storage.delete("temp");
    await storage.delete("temp");

    expect(await storage.exists("temp")).toBe(false);
    await expect(storage.get("temp")).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });
});
