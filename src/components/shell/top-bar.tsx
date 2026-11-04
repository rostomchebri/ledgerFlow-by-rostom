"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { cn } from "@/lib/utils";

type TopBarProps = {
  user: { name: string; email: string };
  initials: string;
  firmName: string;
  roleLabel: string;
  onOpenMenu: () => void;
};

export function TopBar({
  user,
  initials,
  firmName,
  roleLabel,
  onOpenMenu,
}: TopBarProps) {
  const t = useTranslations("shell");
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [unread, setUnread] = useState(2);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileSearchOpen(window.innerWidth < 768);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false);
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/clients?q=${encodeURIComponent(value)}` : "/clients");
    setMobileSearchOpen(false);
  }

  const searchForm = (
    <form onSubmit={handleSearchSubmit} className="relative w-full" role="search">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-10 w-full rounded-xl border border-border/80 bg-background/80 ps-10 pe-16 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
      />
      <kbd className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground sm:flex">
        ⌘K
      </kbd>
    </form>
  );

  return (
    <div className="border-b border-border/70 bg-card/85 backdrop-blur-xl">
      <div className="flex h-[72px] items-center gap-3 px-4 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t("openMenu")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <WalletCards aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight">LedgerFlow</span>
        </Link>

        <div className="hidden w-full max-w-md md:block">{searchForm}</div>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={t("searchPlaceholder")}
            aria-expanded={mobileSearchOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            {mobileSearchOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Search aria-hidden="true" className="h-5 w-5" />
            )}
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setProfileOpen(false);
              }}
              aria-label={t("notifications")}
              aria-expanded={notificationsOpen}
              aria-haspopup="menu"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell aria-hidden="true" className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute end-2 top-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                role="menu"
                className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/80 bg-popover shadow-popover"
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{t("notificationsTitle")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("notificationsUnread", { count: unread })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnread(0)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("markAllRead")}
                  </button>
                </div>
                <ul className="divide-y">
                  <NotificationItem
                    title={t("notificationInvoiceTitle")}
                    body={t("notificationInvoiceBody")}
                    time={t("notificationInvoiceTime")}
                    unread={unread > 0}
                    icon={<WalletCards aria-hidden="true" className="h-4 w-4" />}
                  />
                  <NotificationItem
                    title={t("notificationTaskTitle")}
                    body={t("notificationTaskBody")}
                    time={t("notificationTaskTime")}
                    unread={unread > 1}
                    icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
                  />
                </ul>
                <div className="border-t px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">{t("notificationsHint")}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              aria-label={t("profileMenu")}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-muted sm:pe-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/25">
                {initials || "LF"}
              </span>
              <span className="hidden max-w-32 text-start sm:block">
                <span className="block truncate text-sm font-semibold leading-tight">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "hidden h-4 w-4 text-muted-foreground transition-transform sm:block",
                  profileOpen && "rotate-180",
                )}
              />
            </button>

            {profileOpen ? (
              <div
                role="menu"
                className="absolute end-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border/80 bg-popover shadow-popover"
              >
                <div className="border-b bg-muted/30 px-4 py-3">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="space-y-1 border-b px-3 py-2 text-sm">
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

      {mobileSearchOpen ? (
        <div className="border-t border-border/70 px-4 py-2.5 md:hidden">{searchForm}</div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  title,
  body,
  time,
  unread,
  icon,
}: {
  title: string;
  body: string;
  time: string;
  unread: boolean;
  icon: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{title}</span>
          {unread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{body}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">{time}</p>
      </div>
    </li>
  );
}
