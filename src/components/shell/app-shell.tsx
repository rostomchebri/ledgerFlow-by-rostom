"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  DesktopDock,
  MobileDock,
  MobileMoreSheet,
} from "@/components/shell/nav-dock";
import { PageTransition } from "@/components/shell/page-transition";
import { TopBar } from "@/components/shell/top-bar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  user: { name: string; email: string };
  initials: string;
  firmName: string;
  roleLabel: string;
  children: React.ReactNode;
};

const DOCK_STORAGE_KEY = "ledgerflow-sidebar";

export function AppShell({ user, initials, firmName, roleLabel, children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchSignal, setSearchSignal] = useState(0);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(DOCK_STORAGE_KEY) === "collapsed");
    } catch {
      // Private browsing can reject localStorage; keep the expanded default.
    }
  }, []);

  // A route change always dismisses the mobile sheet.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  const openMore = useCallback(() => setMoreOpen(true), []);
  const requestSearch = useCallback(() => {
    setMoreOpen(false);
    setSearchSignal((signal) => signal + 1);
  }, []);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(DOCK_STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Keep the in-memory state even if persistence is unavailable.
      }
      return next;
    });
  }

  return (
    <div className="relative min-h-screen">
      <DesktopDock
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onSearch={requestSearch}
      />

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-out-soft",
          collapsed ? "lg:ps-[92px]" : "lg:ps-[116px]",
        )}
      >
        <header className="sticky top-0 z-30">
          <TopBar
            user={user}
            initials={initials}
            firmName={firmName}
            roleLabel={roleLabel}
            searchSignal={searchSignal}
          />
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileDock
        moreOpen={moreOpen}
        onSearch={requestSearch}
        onOpenMore={openMore}
        onNavigate={closeMore}
      />

      <MobileMoreSheet
        open={moreOpen}
        onClose={closeMore}
        firmName={firmName}
        roleLabel={roleLabel}
        initials={initials}
      />
    </div>
  );
}
