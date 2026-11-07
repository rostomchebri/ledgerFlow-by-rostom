"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Headphones,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { AppNav } from "@/components/app-nav";
import { LiquidGlassLogo } from "@/components/brand/liquid-glass-logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import {
  getMobileActiveKey,
  isActivePath,
  MOBILE_OVERFLOW_ITEMS,
  MOBILE_PRIMARY_ITEMS,
  NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

type DesktopDockProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSearch: () => void;
};

/**
 * Desktop rail: brand, a detached circular search control and the floating
 * vertical dock. The rail is pointer-transparent so it can never block page
 * content; only the controls themselves accept input.
 */
export function DesktopDock({ collapsed, onToggleCollapsed, onSearch }: DesktopDockProps) {
  const t = useTranslations("shell");

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 start-0 z-40 hidden items-center justify-center transition-[width] duration-300 ease-out-soft lg:flex",
        collapsed ? "w-[84px]" : "w-[108px]",
      )}
    >
      <div className="pointer-events-auto flex max-h-[calc(100dvh-1.25rem)] flex-col items-center gap-3">
        <Link
          href="/dashboard"
          title="LedgerFlow"
          aria-label="LedgerFlow"
          className="rounded-[0.85rem] outline-none transition-transform duration-300 ease-out-soft hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <LiquidGlassLogo size={collapsed ? 36 : 42} label="LedgerFlow" />
        </Link>

        <button
          type="button"
          onClick={onSearch}
          aria-label={t("search")}
          title={t("search")}
          className="dock-search flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Search aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>

        <div
          className={cn(
            "dock-shell flex flex-col items-center gap-0.5 p-1.5 transition-[width] duration-300 ease-out-soft",
            collapsed ? "w-16" : "w-[92px]",
          )}
        >
          <AppNav items={NAV_ITEMS} compact={collapsed} className="w-full" />

          <span aria-hidden="true" className="dock-divider" />

          <div
            className={cn(
              "flex w-full items-center justify-center gap-1 pt-0.5",
              collapsed && "flex-col",
            )}
          >
            <a
              href="mailto:support@ledgerflow.app"
              aria-label={t("supportCta")}
              title={t("supportCta")}
              className="dock-utility"
            >
              <Headphones aria-hidden="true" className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
              title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
              aria-expanded={!collapsed}
              className="dock-utility"
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
              ) : (
                <PanelLeftClose aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type MobileDockProps = {
  moreOpen: boolean;
  onSearch: () => void;
  onOpenMore: () => void;
  onNavigate: () => void;
};

/**
 * Mobile adaptation of the reference: a floating horizontal glass dock with
 * four daily destinations plus a "More" sheet, and a detached circular search
 * button hovering just above it.
 */
export function MobileDock({ moreOpen, onSearch, onOpenMore, onNavigate }: MobileDockProps) {
  const t = useTranslations("shell");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const activeKey = getMobileActiveKey(pathname);

  return (
    <>
      <button
        type="button"
        onClick={onSearch}
        aria-label={t("search")}
        title={t("search")}
        className="dock-search fixed bottom-[calc(5.9rem+env(safe-area-inset-bottom))] end-4 z-40 flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:hidden"
      >
        <Search aria-hidden="true" className="h-[19px] w-[19px]" />
      </button>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="dock-shell pointer-events-auto w-full max-w-[30rem] p-1.5">
          <AppNav
            items={MOBILE_PRIMARY_ITEMS}
            orientation="horizontal"
            activeKey={activeKey}
            onNavigate={onNavigate}
            className="w-full"
            action={{
              key: "more",
              label: tNav("more"),
              icon: MoreHorizontal,
              active: activeKey === "more",
              expanded: moreOpen,
              controls: "mobile-more-sheet",
              onSelect: onOpenMore,
            }}
          />
        </div>
      </div>
    </>
  );
}

type MobileMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  firmName: string;
  roleLabel: string;
  initials: string;
};

/** Bottom sheet for destinations that do not fit in the mobile dock. */
export function MobileMoreSheet({
  open,
  onClose,
  firmName,
  roleLabel,
  initials,
}: MobileMoreSheetProps) {
  const t = useTranslations("shell");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const workspaceOverflow = MOBILE_OVERFLOW_ITEMS.filter((item) => item.group === "workspace");

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-slate-950/40 backdrop-blur-md"
      />

      <div
        ref={panelRef}
        id="mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-more-title"
        className="glass-sheet sheet-panel absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden rounded-t-[1.75rem] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-[hsl(var(--foreground)/0.18)]" />

        <div className="flex items-center justify-between px-1 py-3">
          <h2 id="mobile-more-title" className="text-base font-semibold tracking-[-0.01em]">
            {tNav("more")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="dock-utility h-9 w-9"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88dvh-5.25rem)] overflow-y-auto overscroll-contain pb-1">
          <div className="glass-soft mb-4 flex items-center gap-3 rounded-2xl px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] text-[11px] font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              {initials || "LF"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{firmName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {t("signedInAs")} · {roleLabel}
              </span>
            </span>
          </div>

          <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
            {tNav("groups.workspace")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {workspaceOverflow.map((item) => (
              <SheetLink
                key={item.key}
                href={item.href}
                label={tNav(item.key)}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
                onNavigate={onClose}
              />
            ))}
          </div>

          <p className="px-1 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
            {tNav("groups.account")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <SheetLink
                key={item.key}
                href={item.href}
                label={tNav(item.key)}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
                onNavigate={onClose}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[hsl(var(--border)/0.42)] bg-[var(--glass-surface-soft)] p-2">
            <ThemeToggle className="h-9 w-9 shrink-0 border-transparent bg-transparent" />
            <LocaleSwitcher className="min-w-0 flex-1 justify-between border-0 bg-transparent" />
          </div>

          <a
            href="mailto:support@ledgerflow.app"
            className="mt-2 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/[0.07] px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
              <Headphones aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="flex-1 truncate">{t("supportCta")}</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
          </a>
        </div>
      </div>
    </div>
  );
}

function SheetLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: (typeof NAV_ITEMS)[number]["href"];
  label: string;
  icon: (typeof NAV_ITEMS)[number]["icon"];
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-transparent text-foreground/80 hover:bg-[var(--dock-item-hover)] hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
          active
            ? "border-primary/15 bg-primary/10 text-primary"
            : "border-[hsl(var(--border)/0.45)] bg-[var(--glass-surface-soft)] text-muted-foreground",
        )}
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
