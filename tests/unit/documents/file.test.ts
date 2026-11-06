import { describe, expect, it } from "vitest";

import {
  contentDisposition,
  extensionOf,
  isAllowedDocumentMimeType,
  normalizeOriginalFilename,
  resolveDocumentFilename,
  resolveMimeType,
} from "@/lib/documents/file";

describe("extensionOf", () => {
  it("returns the lowercase extension", () => {
    expect(extensionOf("Invoice.PDF")).toBe("pdf");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
  });

  it("handles paths, dotfiles and names without an extension", () => {
    expect(extensionOf("folder/sub/report.xlsx")).toBe("xlsx");
    expect(extensionOf(".env")).toBe("");
    expect(extensionOf("README")).toBe("");
    expect(extensionOf("trailing.")).toBe("");
  });
});

describe("resolveMimeType", () => {
  it("keeps an allowed reported type", () => {
    expect(resolveMimeType("image/png", "scan.png")).toBe("image/png");
    expect(resolveMimeType("APPLICATION/PDF", "scan.pdf")).toBe("application/pdf");
  });

  it("falls back to the extension for empty and generic types", () => {
    expect(resolveMimeType("", "scan.PDF")).toBe("application/pdf");
    expect(resolveMimeType(undefined, "receipt.jpeg")).toBe("image/jpeg");
    expect(resolveMimeType("application/octet-stream", "ledger.csv")).toBe("text/csv");
    expect(resolveMimeType("application/octet-stream", "sheet.XLSX")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("rejects unsupported types and extensions", () => {
    expect(resolveMimeType("application/x-msdownload", "setup.exe")).toBeNull();
    expect(resolveMimeType("", "script.js")).toBeNull();
  });

  it("reads the allowlist case-insensitively", () => {
    expect(isAllowedDocumentMimeType("TEXT/CSV")).toBe(true);
    expect(isAllowedDocumentMimeType("text/html")).toBe(false);
  });
});

describe("resolveDocumentFilename", () => {
  it("prefers the original upload filename so the extension survives a rename", () => {
    expect(
      resolveDocumentFilename({
        name: "March invoice",
        originalFilename: "INV-2026-018.pdf",
        mimeType: "application/pdf",
      }),
    ).toBe("INV-2026-018.pdf");
  });

  it("falls back to the display name for legacy rows", () => {
    expect(
      resolveDocumentFilename({ name: "Tax papers", mimeType: "application/pdf" }),
    ).toBe("Tax papers.pdf");
  });

  it("restores a missing extension from the MIME type", () => {
    expect(
      resolveDocumentFilename({
        name: "Receipt",
        originalFilename: "Receipt",
        mimeType: "image/jpeg",
      }),
    ).toBe("Receipt.jpg");
  });

  it("does not double up an existing extension", () => {
    expect(
      resolveDocumentFilename({
        name: "report",
        originalFilename: "report.csv",
        mimeType: "text/csv",
      }),
    ).toBe("report.csv");
  });
});

describe("normalizeOriginalFilename", () => {
  it("strips client paths but preserves unicode and the extension", () => {
    expect(normalizeOriginalFilename("C:\\Users\\me\\Facture café.pdf")).toBe(
      "Facture café.pdf",
    );
    expect(normalizeOriginalFilename("/tmp/uploads/تقرير.pdf")).toBe("تقرير.pdf");
  });

  it("removes control characters and never returns an empty name", () => {
    expect(normalizeOriginalFilename("bad\r\nname.pdf")).toBe("badname.pdf");
    expect(normalizeOriginalFilename("   ")).toBe("document");
  });
});

describe("contentDisposition", () => {
  it("encodes unicode names and keeps an ASCII fallback", () => {
    const header = contentDisposition("attachment", "Facture café.pdf");

    expect(header).toContain("attachment;");
    expect(header).toContain('filename="Facture cafe.pdf"');
    expect(header).toContain("filename*=UTF-8''Facture%20caf%C3%A9.pdf");
  });

  it("prevents header injection through the filename", () => {
    const header = contentDisposition("inline", "evil\r\nSet-Cookie: secret=1.pdf");

    // The payload is flattened into the filename value; it must never create a
    // second header line.
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.startsWith("inline; filename=")).toBe(true);
  });
});
