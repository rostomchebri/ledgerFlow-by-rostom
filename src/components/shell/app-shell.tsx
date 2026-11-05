"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppNav } from "@/components/app-nav";
import { LiquidGlassLogo } from "@/components/brand/liquid-glass-logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { TopBar } from "@/components/shell/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  user: { name: string; email: string };
  initials: string;
  firmName: string;
  roleLabel: string;
  children: React.ReactNode;
};

const SIDEBAR_STORAGE_KEY = "ledgerflow-sidebar";

export function AppShell({ user, initials, firmName, roleLabel, children }: AppShellProps) {
  const t = useTranslations("shell");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed");
    } catch {
      // Private browsing can reject localStorage; keep the expanded default.
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Keep the in-memory state even if persistence is unavailable.
      }
      return next;
    });
  }

  return (
    <div className="relative min-h-screen">
      <aside
        className={cn(
          "glass-sidebar fixed inset-y-0 start-0 z-40 hidden flex-col border-e border-[hsl(var(--sidebar-border)/0.55)] transition-[width] duration-300 ease-out-soft lg:flex",
          collapsed ? "w-[86px]" : "w-[272px]",
        )}
      >
        <SidebarContent
          firmName={firmName}
          roleLabel={roleLabel}
          initials={initials}
          collapsed={collapsed}
        />

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          aria-expanded={!collapsed}
          className="absolute -end-3 top-[94px] z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border)/0.65)] bg-[hsl(var(--card)/0.92)] text-muted-foreground shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:inline-flex"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
          )}
        </button>
      </aside>

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-out-soft",
          collapsed ? "lg:ps-[86px]" : "lg:ps-[272px]",
        )}
      >
        <header className="sticky top-0 z-30">
          <TopBar
            user={user}
            initials={initials}
            firmName={firmName}
            roleLabel={roleLabel}
            onOpenMenu={() => setMobileOpen(true)}
          />
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-8 lg:py-8 xl:px-10">
          <div className="animate-fade-up">{children}</div>
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-md"
          />
          <aside className="glass-sidebar absolute inset-y-0 start-0 flex w-[min(20rem,88vw)] flex-col border-e border-[hsl(var(--sidebar-border)/0.55)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
              className="glass-icon-button absolute end-3 top-4 z-10 h-9 w-9"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <SidebarContent
              firmName={firmName}
              roleLabel={roleLabel}
              initials={initials}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({
  firmName,
  roleLabel,
  initials,
  collapsed = false,
  onNavigate,
}: {
  firmName: string;
  roleLabel: string;
  initials: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell");
  const tNav = useTranslations("nav");

  return (
    <>
      <div
        className={cn(
          "flex h-[76px] shrink-0 items-center border-b border-[hsl(var(--sidebar-border)/0.5)]",
          collapsed ? "justify-center px-2" : "gap-3 px-5",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            collapsed && "justify-center",
          )}
          title="LedgerFlow"
        >
          <LiquidGlassLogo size={collapsed ? 38 : 40} />
          {!collapsed ? (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-bold tracking-[-0.02em]">
                LedgerFlow
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                {t("workspace")}
              </span>
            </span>
          ) : null}
        </Link>
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          collapsed ? "px-2 py-4" : "px-4 py-5",
        )}
      >
        <p
          className={cn(
            "px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70",
            collapsed && "sr-only",
          )}
        >
          {tNav("mainLabel")}
        </p>
        <AppNav collapsed={collapsed} onNavigate={onNavigate} />

        {collapsed ? (
          <a
            href="mailto:support@ledgerflow.app"
            title={t("supportCta")}
            className="mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary transition-colors hover:bg-primary/[0.12]"
          >
            <Headphones aria-hidden="true" className="h-[18px] w-[18px]" />
            <span className="sr-only">{t("supportCta")}</span>
          </a>
        ) : (
          <div className="glass-soft relative mt-6 overflow-hidden rounded-2xl p-4">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -end-8 -top-10 h-24 w-24 rounded-full bg-primary/15 blur-2xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -start-8 h-20 w-20 rounded-full bg-[hsl(var(--chart-4)/0.16)] blur-2xl"
            />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.8),inset_0_1px_0_rgba(255,255,255,0.35)]">
              <Headphones aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <p className="relative mt-3 flex items-center gap-1.5 text-sm font-semibold">
              {t("supportTitle")}
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary/70" />
            </p>
            <p className="relative mt-1 text-xs leading-5 text-muted-foreground">
              {t("supportBody")}
            </p>
            <a
              href="mailto:support@ledgerflow.app"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "relative mt-3 h-8 w-full rounded-lg text-xs",
              )}
            >
              {t("supportCta")}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </a>
          </div>
        )}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-[hsl(var(--sidebar-border)/0.5)]",
          collapsed ? "space-y-2 p-2" : "space-y-3 p-4",
        )}
      >
        {collapsed ? (
          <>
            <ThemeToggle className="mx-auto" />
            <span
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] text-[11px] font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
              title={`${firmName} · ${initials || "LF"}`}
            >
              {initials || "LF"}
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleSwitcher className="min-w-0 flex-1 justify-between" />
            </div>
            <div className="glass-soft flex items-center gap-2.5 rounded-xl px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] text-[10px] font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                {initials || "LF"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{firmName}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {t("signedInAs")} · {roleLabel}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
