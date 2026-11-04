"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Headphones, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AppNav } from "@/components/app-nav";
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

export function AppShell({
  user,
  initials,
  firmName,
  roleLabel,
  children,
}: AppShellProps) {
  const t = useTranslations("shell");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[268px] flex-col border-e border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent firmName={firmName} roleLabel={roleLabel} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:ps-[268px]">
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
          {children}
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 start-0 flex w-[min(20rem,88vw)] flex-col border-e border-sidebar-border bg-sidebar shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute end-3 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="h-5 w-5" />
              <span className="sr-only">{t("closeMenu")}</span>
            </button>
            <SidebarContent
              firmName={firmName}
              roleLabel={roleLabel}
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
  onNavigate,
}: {
  firmName: string;
  roleLabel: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell");
  const tNav = useTranslations("nav");

  return (
    <>
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <WalletCards aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold tracking-tight">LedgerFlow</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {t("workspace")}
            </span>
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
          {tNav("mainLabel")}
        </p>
        <AppNav onNavigate={onNavigate} />

        <div className="relative mt-6 overflow-hidden rounded-2xl border border-primary/10 bg-primary/[0.045] p-4">
          <span className="absolute -end-6 -top-6 h-20 w-20 rounded-full bg-primary/10" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <Headphones aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <p className="relative mt-3 text-sm font-semibold">{t("supportTitle")}</p>
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
      </div>

      <div className="shrink-0 space-y-3 border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher className="min-w-0 flex-1 justify-between" />
        </div>
        <div className="rounded-xl bg-muted/50 px-3 py-2.5">
          <p className="truncate text-xs font-semibold">{firmName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {t("signedInAs")} · {roleLabel}
          </p>
        </div>
      </div>
    </>
  );
}
