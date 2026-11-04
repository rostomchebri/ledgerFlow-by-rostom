import { describe, expect, it } from "vitest";

import { buildStorageKey, sanitizeFilename, sanitizeSegment } from "@/lib/storage/keys";

describe("sanitizeFilename", () => {
  it("keeps the basename of POSIX and Windows paths", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\demo\\invoice.pdf")).toBe("invoice.pdf");
    expect(sanitizeFilename("/tmp/report 2026.xlsx")).toBe("report-2026.xlsx");
  });

  it("normalises accents and unsafe characters", () => {
    expect(sanitizeFilename("Résumé final (v2).pdf")).toBe("Resume-final-v2-.pdf");
  });

  it("never allows dot-dot sequences", () => {
    expect(sanitizeFilename("...secret...txt")).toBe("secret.txt");
  });

  it("falls back to a stable name when nothing is left", () => {
    expect(sanitizeFilename("!!!")).toBe("file");
    expect(sanitizeFilename("")).toBe("file");
  });

  it("caps the filename at 120 characters", () => {
    expect(sanitizeFilename(`${"a".repeat(200)}.pdf`)).toHaveLength(120);
  });
});

describe("sanitizeSegment", () => {
  it("removes separators and traversal characters", () => {
    expect(sanitizeSegment("firm/../x")).toBe("firm-x");
    expect(sanitizeSegment("client id 42")).toBe("client-id-42");
  });

  it("falls back to a stable segment and caps its length", () => {
    expect(sanitizeSegment("../")).toBe("unknown");
    expect(sanitizeSegment("a".repeat(200))).toHaveLength(80);
  });
});

describe("buildStorageKey", () => {
  it("builds a firm-scoped key with a sanitised filename", () => {
    expect(
      buildStorageKey({
        firmId: "cm_firm",
        category: "documents",
        clientId: "cm_client",
        id: "cm_doc",
        filename: "../../Facture 2026.pdf",
      }),
    ).toBe("firm/cm_firm/documents/clients/cm_client/cm_doc-Facture-2026.pdf");
  });

  it("omits the client segment when no client is provided", () => {
    expect(
      buildStorageKey({
        firmId: "firm_1",
        category: "documents",
        id: "doc_1",
        filename: "a.pdf",
      }),
    ).toBe("firm/firm_1/documents/doc_1-a.pdf");
  });

  it("always starts inside the firm prefix, even with hostile input", () => {
    const key = buildStorageKey({
      firmId: "../other",
      category: "../../etc",
      id: "../doc",
      filename: "../../secret",
    });

    expect(key.startsWith("firm/")).toBe(true);
    expect(key).not.toContain("..");
  });
});
