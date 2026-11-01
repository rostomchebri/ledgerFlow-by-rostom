"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavKey =
  | "overview"
  | "clients"
  | "documents"
  | "invoices"
  | "tasks"
  | "reports"
  | "settings";

type NavItem = {
  labelKey: NavKey;
  href?: "/" | "/clients";
  icon: LucideIcon;
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { labelKey: "overview", href: "/", icon: LayoutDashboard },
  { labelKey: "clients", href: "/clients", icon: Users },
  { labelKey: "documents", icon: FileText, soon: true },
  { labelKey: "invoices", icon: Receipt, soon: true },
  { labelKey: "tasks", icon: ListChecks, soon: true },
  { labelKey: "reports", icon: BarChart3, soon: true },
];

const SECONDARY_ITEMS: NavItem[] = [{ labelKey: "settings", icon: Settings, soon: true }];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const Icon = item.icon;
  const content = (
    <>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {item.soon ? (
        <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {tCommon("soon")}
        </span>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {content}
    </Link>
  );
}

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label={t("mainLabel")}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.labelKey} item={item} active={isActive(item)} />
      ))}
      <div className="my-2 h-px bg-border" />
      {SECONDARY_ITEMS.map((item) => (
        <NavLink key={item.labelKey} item={item} active={isActive(item)} />
      ))}
    </nav>
  );
}
