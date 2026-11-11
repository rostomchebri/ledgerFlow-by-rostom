import type { NavHref } from "./navigation";

/**
 * Global keyboard shortcuts are pure data so the bindings can be unit tested
 * and reused by both the handler and the help dialog.
 *
 * Sequences use a prefix key followed by a destination key: `g d` navigates to
 * the dashboard, `n c` opens the new-client form.
 */
export const GO_PREFIX = "g";
export const CREATE_PREFIX = "n";

export type CreateHref =
  | "/clients/new"
  | "/invoices/new"
  | "/transactions/new"
  | "/tasks/new";

export const GO_SHORTCUTS: Readonly<Record<string, NavHref>> = {
  d: "/dashboard",
  t: "/transactions",
  i: "/invoices",
  c: "/clients",
  r: "/reports",
  o: "/documents",
  k: "/tasks",
  n: "/notifications",
  s: "/settings",
};

export const CREATE_SHORTCUTS: Readonly<Record<string, CreateHref>> = {
  c: "/clients/new",
  i: "/invoices/new",
  t: "/transactions/new",
  k: "/tasks/new",
};

export type SequenceTarget =
  | { kind: "navigate"; href: NavHref }
  | { kind: "create"; href: CreateHref };

/** Resolves the second key of a `g …` or `n …` sequence. */
export function resolveSequence(prefix: string, key: string): SequenceTarget | null {
  const normalized = key.toLowerCase();

  if (prefix === GO_PREFIX) {
    const href = GO_SHORTCUTS[normalized];
    return href ? { kind: "navigate", href } : null;
  }

  if (prefix === CREATE_PREFIX) {
    const href = CREATE_SHORTCUTS[normalized];
    return href ? { kind: "create", href } : null;
  }

  return null;
}

/**
 * `?` is layout-dependent: most layouts report `key === "?"`, while synthetic
 * events (and some IMEs) report `"/"` with Shift held. Accept both so the help
 * dialog opens everywhere.
 */
export function isHelpShortcut(event: { key: string; shiftKey: boolean }): boolean {
  return event.key === "?" || (event.key === "/" && event.shiftKey);
}

/**
 * Shortcuts must never hijack typing. Uses duck typing so the same helper can
 * be tested without a DOM.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as (HTMLElement & { tagName?: string }) | null;
  if (!element) return false;
  if (element.isContentEditable) return true;

  const tag = element.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
