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
import { useCallback, useEffect, useRef, useState } from "react";

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

const ALL_ITEMS = [...NAV_ITEMS, ...SECONDARY_ITEMS];

type IndicatorGeometry = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function isActivePath(pathname: string, href: NavItem["href"]): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
  registerRef,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  registerRef: (href: NavItem["href"], node: HTMLAnchorElement | null) => void;
}) {
  const t = useTranslations("nav");
  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <Link
      href={item.href}
      ref={(node) => registerRef(item.href, node)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group relative z-10 flex items-center gap-3 rounded-xl text-sm font-medium outline-none transition-[color,background-color,transform] duration-200 ease-out-soft focus-visible:ring-2 focus-visible:ring-ring/40",
        collapsed ? "mx-auto h-11 w-11 justify-center" : "px-3 py-2.5",
        active
          ? "text-primary"
          : "text-sidebar-foreground/70 hover:bg-[var(--sidebar-nav-hover)] hover:text-sidebar-foreground",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg transition-[transform,color] duration-300 ease-out-soft",
          collapsed ? "h-10 w-10" : "h-8 w-8",
          active
            ? "scale-[1.06] text-primary"
            : "text-muted-foreground group-hover:scale-[1.06] group-hover:text-foreground",
          "group-active:scale-95",
        )}
      >
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>

      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{label}</span>
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-primary transition-[opacity,transform] duration-300 ease-out-soft",
              active ? "scale-100 opacity-100" : "scale-0 opacity-0",
            )}
          />
        </>
      ) : (
        <span aria-hidden="true" className="nav-tooltip">
          {label}
        </span>
      )}
    </Link>
  );
}

function NavGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          "px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70",
          collapsed && "sr-only",
        )}
      >
        {label}
      </p>
      {children}
    </div>
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
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<NavItem["href"], HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<IndicatorGeometry | null>(null);
  const [positioned, setPositioned] = useState(false);

  const activeHref = ALL_ITEMS.find((item) => isActivePath(pathname, item.href))?.href;

  const registerRef = useCallback(
    (href: NavItem["href"], node: HTMLAnchorElement | null) => {
      if (node) itemRefs.current.set(href, node);
      else itemRefs.current.delete(href);
    },
    [],
  );

  const measure = useCallback(() => {
    const nav = navRef.current;
    const node = activeHref ? itemRefs.current.get(activeHref) : undefined;

    if (!nav || !node) {
      setIndicator(null);
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = node.getBoundingClientRect();
    setIndicator({
      top: linkRect.top - navRect.top,
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      height: linkRect.height,
    });
  }, [activeHref]);

  useEffect(() => {
    measure();
  }, [measure, collapsed]);

  useEffect(() => {
    if (!indicator || positioned) return;
    const frame = window.requestAnimationFrame(() => setPositioned(true));
    return () => window.cancelAnimationFrame(frame);
  }, [indicator, positioned]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(nav);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <nav
      ref={navRef}
      className={cn("relative flex flex-col gap-4", className)}
      aria-label={t("mainLabel")}
    >
      {indicator ? (
        <span
          aria-hidden="true"
          className="nav-active-indicator"
          style={{
            width: `${indicator.width}px`,
            height: `${indicator.height}px`,
            opacity: positioned ? 1 : 0,
            transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
          }}
        >
          {!collapsed ? (
            <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary/80" />
          ) : null}
        </span>
      ) : null}

      <NavGroup label={t("groups.workspace")} collapsed={collapsed}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.labelKey}
            item={item}
            active={item.href === activeHref}
            collapsed={collapsed}
            onNavigate={onNavigate}
            registerRef={registerRef}
          />
        ))}
      </NavGroup>

      <NavGroup label={t("groups.account")} collapsed={collapsed}>
        {SECONDARY_ITEMS.map((item) => (
          <NavLink
            key={item.labelKey}
            item={item}
            active={item.href === activeHref}
            collapsed={collapsed}
            onNavigate={onNavigate}
            registerRef={registerRef}
          />
        ))}
      </NavGroup>
    </nav>
  );
}
