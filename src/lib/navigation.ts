import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CheckSquare,
  FolderOpen,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for application destinations.
 *
 * Keeping the list pure (no React, no translations) makes it safe to import
 * from server components, client components and unit tests. Labels are looked
 * up from the `nav` message namespace at render time.
 */
export type NavKey =
  | "dashboard"
  | "transactions"
  | "reports"
  | "invoices"
  | "clients"
  | "documents"
  | "tasks"
  | "notifications"
  | "settings";

export type NavHref =
  | "/dashboard"
  | "/transactions"
  | "/reports"
  | "/invoices"
  | "/clients"
  | "/documents"
  | "/tasks"
  | "/notifications"
  | "/settings";

export type NavGroup = "workspace" | "account";

export type NavItem = {
  key: NavKey;
  href: NavHref;
  icon: LucideIcon;
  group: NavGroup;
};

/** Ordered exactly as the dock renders it: core workspace first, account last. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, group: "workspace" },
  { key: "transactions", href: "/transactions", icon: ArrowLeftRight, group: "workspace" },
  { key: "reports", href: "/reports", icon: BarChart3, group: "workspace" },
  { key: "invoices", href: "/invoices", icon: ReceiptText, group: "workspace" },
  { key: "clients", href: "/clients", icon: Users, group: "workspace" },
  { key: "documents", href: "/documents", icon: FolderOpen, group: "workspace" },
  { key: "tasks", href: "/tasks", icon: CheckSquare, group: "workspace" },
  { key: "notifications", href: "/notifications", icon: Bell, group: "account" },
  { key: "settings", href: "/settings", icon: Settings, group: "account" },
];

/**
 * The four daily destinations that fit comfortably in the mobile dock. Every
 * remaining destination is one tap away in the "More" sheet, so no feature is
 * removed on small screens.
 */
export const MOBILE_PRIMARY_KEYS = [
  "dashboard",
  "transactions",
  "invoices",
  "clients",
] as const satisfies readonly NavKey[];

const MOBILE_PRIMARY_KEY_SET: ReadonlySet<NavKey> = new Set(MOBILE_PRIMARY_KEYS);

export const MOBILE_PRIMARY_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((item) =>
  MOBILE_PRIMARY_KEY_SET.has(item.key),
);

export const MOBILE_OVERFLOW_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => !MOBILE_PRIMARY_KEY_SET.has(item.key),
);

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.group === "account",
);

/** True for an exact destination and any nested route beneath it. */
export function isActivePath(
  pathname: string | null | undefined,
  href: NavHref,
): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve the destination that owns the current pathname, if any. */
export function findActiveNavItem(pathname: string | null | undefined): NavItem | undefined {
  return NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
}

/**
 * Which dock slot should be active on mobile. Routes that live in the overflow
 * sheet highlight the "More" control instead of leaving the dock unselected.
 */
export function getMobileActiveKey(
  pathname: string | null | undefined,
): NavKey | "more" {
  const active = findActiveNavItem(pathname);
  return active && MOBILE_PRIMARY_KEY_SET.has(active.key) ? active.key : "more";
}
