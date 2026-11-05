"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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

import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "transactions"
  | "reports"
  | "invoices"
  | "clients"
  | "documents"
  | "tasks"
  | "notifications"
  | "settings";

type NavItem = {
  labelKey: NavKey;
  href:
    | "/dashboard"
    | "/transactions"
    | "/reports"
    | "/invoices"
    | "/clients"
    | "/documents"
    | "/tasks"
    | "/notifications"
    | "/settings";
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "transactions", href: "/transactions", icon: ArrowLeftRight },
  { labelKey: "reports", href: "/reports", icon: BarChart3 },
  { labelKey: "invoices", href: "/invoices", icon: ReceiptText },
  { labelKey: "clients", href: "/clients", icon: Users },
  { labelKey: "documents", href: "/documents", icon: FolderOpen },
  { labelKey: "tasks", href: "/tasks", icon: CheckSquare },
];

const SECONDARY_ITEMS: NavItem[] = [
  { labelKey: "notifications", href: "/notifications", icon: Bell },
  { labelKey: "settings", href: "/settings", icon: Settings },
];

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        collapsed ? "mx-auto h-11 w-11 justify-center" : "px-3 py-2.5",
        active
          ? "border border-primary/20 bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.85),inset_0_1px_0_rgba(255,255,255,0.28)]"
          : "border border-transparent text-sidebar-foreground/65 hover:border-[hsl(var(--card)/0.4)] hover:bg-[hsl(var(--card)/0.5)] hover:text-sidebar-foreground dark:hover:bg-white/[0.055]",
      )}
    >
      {active && !collapsed ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 start-0 w-[3px] -translate-x-1 rounded-full bg-white/75 dark:bg-primary-foreground/70"
        />
      ) : null}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg transition-colors",
          collapsed ? "h-10 w-10" : "h-8 w-8",
          active
            ? "bg-white/15 text-primary-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{label}</span>
          {active ? (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-white/80 dark:bg-primary-foreground/80"
            />
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

export function AppNav({
  className,
  collapsed = false,
  onNavigate,
}: {
  className?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = (item: NavItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <nav
      className={cn("flex flex-col", collapsed ? "gap-1.5" : "gap-1", className)}
      aria-label={t("mainLabel")}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.labelKey}
          item={item}
          active={isActive(item)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
      <div
        className={cn(
          "my-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent",
          collapsed && "mx-2",
        )}
      />
      {SECONDARY_ITEMS.map((item) => (
        <NavLink
          key={item.labelKey}
          item={item}
          active={isActive(item)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
