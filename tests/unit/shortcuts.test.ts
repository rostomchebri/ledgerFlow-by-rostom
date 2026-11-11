import { describe, expect, it } from "vitest";

import {
  CREATE_SHORTCUTS,
  GO_SHORTCUTS,
  isEditableTarget,
  isHelpShortcut,
  resolveSequence,
} from "@/lib/shortcuts";

describe("shortcut sequences", () => {
  it("maps every go shortcut to a unique destination", () => {
    const hrefs = Object.values(GO_SHORTCUTS);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("resolves navigation sequences", () => {
    expect(resolveSequence("g", "d")).toEqual({ kind: "navigate", href: "/dashboard" });
    expect(resolveSequence("g", "I")).toEqual({ kind: "navigate", href: "/invoices" });
    expect(resolveSequence("g", "s")).toEqual({ kind: "navigate", href: "/settings" });
  });

  it("resolves create sequences", () => {
    expect(resolveSequence("n", "c")).toEqual({ kind: "create", href: "/clients/new" });
    expect(resolveSequence("n", "i")).toEqual({ kind: "create", href: "/invoices/new" });
    expect(resolveSequence("n", "k")).toEqual({ kind: "create", href: "/tasks/new" });
    expect(Object.keys(CREATE_SHORTCUTS)).toHaveLength(4);
  });

  it("rejects unknown keys and prefixes", () => {
    expect(resolveSequence("g", "z")).toBeNull();
    expect(resolveSequence("n", "z")).toBeNull();
    expect(resolveSequence("x", "d")).toBeNull();
  });
});

describe("isHelpShortcut", () => {
  it("accepts the layout-resolved question mark", () => {
    expect(isHelpShortcut({ key: "?", shiftKey: true })).toBe(true);
  });

  it("accepts synthetic shift+slash events", () => {
    expect(isHelpShortcut({ key: "/", shiftKey: true })).toBe(true);
  });

  it("ignores plain slash and other keys", () => {
    expect(isHelpShortcut({ key: "/", shiftKey: false })).toBe(false);
    expect(isHelpShortcut({ key: "g", shiftKey: false })).toBe(false);
  });
});

describe("isEditableTarget", () => {
  it("treats form fields as editable", () => {
    expect(isEditableTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
  });

  it("treats contenteditable nodes as editable", () => {
    expect(
      isEditableTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget),
    ).toBe(true);
  });

  it("allows shortcuts on ordinary elements", () => {
    expect(isEditableTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget({ tagName: "DIV" } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
