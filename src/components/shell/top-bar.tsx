"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LiquidGlassLogo } from "@/components/brand/liquid-glass-logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { NotificationBell } from "@/components/shell/notification-bell";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { cn } from "@/lib/utils";

type TopBarProps = {
  user: { name: string; email: string };
  initials: string;
  firmName: string;
  roleLabel: string;
  /** Increment to focus the one existing search field (dock button, ⌘K). */
  searchSignal: number;
};

export function TopBar({
  user,
  initials,
  firmName,
  roleLabel,
  searchSignal,
}: TopBarProps) {
  const t = useTranslations("shell");
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const focusSearch = useCallback(() => {
    if (window.innerWidth < 768) setSearchOpen(true);

    // Two frames: the first lets a freshly revealed field mount and paint,
    // the second moves focus without interrupting the reveal animation.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      });
    });
  }, []);

  useEffect(() => {
    if (searchSignal === 0) return;
    focusSearch();
  }, [focusSearch, searchSignal]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearch]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/clients?q=${encodeURIComponent(value)}` : "/clients");
    setSearchOpen(false);
  }

  const searchForm = (
    <form onSubmit={handleSearchSubmit} className="relative w-full" role="search">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("search")}
        className="glass-field h-11 w-full rounded-2xl pe-20 ps-11 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
      />
      <kbd className="glass-soft pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg px-2 py-1 font-sans text-[10px] font-semibold text-muted-foreground sm:flex">
        ⌘K
      </kbd>
    </form>
  );

  return (
    <div className="glass-bar">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:h-[76px] lg:px-8">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 lg:hidden">
          <LiquidGlassLogo size={32} label="LedgerFlow" />
          <span className="text-[15px] font-bold tracking-[-0.02em]">LedgerFlow</span>
        </Link>

        <div className="hidden w-full max-w-md md:block">{searchForm}</div>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="h-10 w-10" />
          <NotificationBell />

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((open) => !open);
              }}
              aria-label={t("profileMenu")}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className={cn(
                "flex items-center gap-2 rounded-2xl border border-transparent p-1 transition-all duration-200 hover:border-[hsl(var(--border)/0.6)] hover:bg-[hsl(var(--card)/0.5)] sm:pe-2.5",
                profileOpen && "border-[hsl(var(--border)/0.65)] bg-[hsl(var(--card)/0.55)]",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-gradient-to-br from-primary via-primary to-[hsl(var(--chart-4))] text-xs font-bold text-primary-foreground shadow-[0_8px_18px_-9px_hsl(var(--primary)/0.8),inset_0_1px_0_rgba(255,255,255,0.35)]">
                {initials || "LF"}
              </span>
              <span className="hidden max-w-32 text-start sm:block">
                <span className="block truncate text-[13px] font-semibold leading-tight">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "hidden h-4 w-4 text-muted-foreground transition-transform duration-200 sm:block",
                  profileOpen && "rotate-180",
                )}
              />
            </button>

            {profileOpen ? (
              <div
                role="menu"
                className="glass-card popover-enter absolute end-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl bg-[hsl(var(--popover)/0.92)] shadow-popover"
              >
                <div className="flex items-center gap-3 border-b border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.35)] px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-gradient-to-br from-primary to-[hsl(var(--chart-4))] text-xs font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                    {initials || "LF"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-1 border-b border-[hsl(var(--border)/0.55)] px-3 py-2 text-sm">
                  <p className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                    <span className="text-muted-foreground">{t("workspace")}</span>
                    <span className="truncate font-medium">{firmName}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                    <span className="text-muted-foreground">{t("role")}</span>
                    <span className="font-medium">{roleLabel}</span>
                  </p>
                </div>
                <div className="space-y-2 p-3">
                  <LocaleSwitcher className="w-full justify-between" />
                  <SignOutButton className="w-full justify-start" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {searchOpen ? (
        <div className="reveal-down border-t border-[hsl(var(--border)/0.5)] px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-2">
            {searchForm}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label={t("closeSearch")}
              className="glass-icon-button h-10 w-10 shrink-0"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
