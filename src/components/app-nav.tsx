"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  BarChart3,
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
  | "settings";

type NavItem = {
  labelKey: NavKey;
  href?: "/dashboard" | "/clients" | "/settings/team";
  icon: LucideIcon;
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "transactions", icon: ArrowLeftRight, soon: true },
  { labelKey: "reports", icon: BarChart3, soon: true },
  { labelKey: "invoices", icon: ReceiptText, soon: true },
  { labelKey: "clients", href: "/clients", icon: Users },
];

const SECONDARY_ITEMS: NavItem[] = [
  { labelKey: "settings", href: "/settings/team", icon: Settings },
];

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const Icon = item.icon;

  const content = (
    <>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          active ? "bg-white/15" : "bg-transparent group-hover:bg-sidebar-accent",
        )}
      >
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {item.soon ? (
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            active
              ? "border-white/30 text-white/75"
              : "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          {tCommon("soon")}
        </span>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        title={tCommon("soon")}
        className="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/45"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      {content}
    </Link>
  );
}

export function AppNav({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav className={cn("flex flex-col gap-1.5", className)} aria-label={t("mainLabel")}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.labelKey}
          item={item}
          active={isActive(item)}
          onNavigate={onNavigate}
        />
      ))}
      <div className="my-3 h-px bg-sidebar-border" />
      {SECONDARY_ITEMS.map((item) => (
        <NavLink
          key={item.labelKey}
          item={item}
          active={isActive(item)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
