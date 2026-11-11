"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  DesktopDock,
  MobileDock,
  MobileMoreSheet,
} from "@/components/shell/nav-dock";
import { PageTransition } from "@/components/shell/page-transition";
import { ShortcutsDialog } from "@/components/shell/shortcuts-dialog";
import { TopBar } from "@/components/shell/top-bar";
import type { FirmRole } from "@/lib/rbac";
import {
  CREATE_PREFIX,
  GO_PREFIX,
  isEditableTarget,
  isHelpShortcut,
  resolveSequence,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

/**
 * The palette is intentionally absent from the initial bundle. It is imported
 * the first time the user opens it (⌘K, the dock button or the top bar), so
 * the shell keeps its small first-load footprint.
 */
const CommandPalette = dynamic(
  () => import("@/components/shell/command-palette").then((module) => module.CommandPalette),
  { ssr: false },
);

type AppShellProps = {
  user: { name: string; email: string };
  initials: string;
  firmName: string;
  role: FirmRole;
  roleLabel: string;
  children: React.ReactNode;
};

const DOCK_STORAGE_KEY = "ledgerflow-sidebar";
const SEQUENCE_TIMEOUT = 1200;

export function AppShell({ user, initials, firmName, role, roleLabel, children }: AppShellProps) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteMounted, setPaletteMounted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(DOCK_STORAGE_KEY) === "collapsed");
    } catch {
      // Private browsing can reject localStorage; keep the expanded default.
    }
    // Signals that the client shell (and its global shortcut listeners) is
    // interactive. Used by the E2E suite so it never types before hydration.
    document.documentElement.dataset.appReady = "true";
    return () => {
      delete document.documentElement.dataset.appReady;
    };
  }, []);

  // A route change always dismisses the mobile sheet and the palette.
  useEffect(() => {
    setMoreOpen(false);
    setPaletteOpen(false);
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

  const openPalette = useCallback(() => {
    setMoreOpen(false);
    setPaletteMounted(true);
    setPaletteOpen(true);
  }, []);

  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  // Global shortcuts: ⌘K palette, `?` help, and `g`/`n` sequences.
  useEffect(() => {
    let sequence: string | null = null;
    let timer: number | undefined;

    function reset() {
      sequence = null;
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteMounted(true);
        setPaletteOpen((open) => !open);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (isHelpShortcut(event)) {
        event.preventDefault();
        reset();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setShortcutsOpen(false);
        reset();
        return;
      }

      const key = event.key.toLowerCase();

      if (sequence) {
        const target = resolveSequence(sequence, key);
        reset();
        if (target) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }

      if (key === GO_PREFIX || key === CREATE_PREFIX) {
        sequence = key;
        timer = window.setTimeout(reset, SEQUENCE_TIMEOUT);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      reset();
    };
  }, [router]);

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
      <a href="#main-content" className="skip-link">
        {t("skipToContent")}
      </a>

      <DesktopDock
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onSearch={openPalette}
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
            onOpenPalette={openPalette}
            onOpenShortcuts={openShortcuts}
          />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-5 outline-none sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileDock
        moreOpen={moreOpen}
        onSearch={openPalette}
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

      {paletteMounted ? (
        <CommandPalette open={paletteOpen} role={role} onClose={closePalette} />
      ) : null}

      <ShortcutsDialog open={shortcutsOpen} role={role} onClose={closeShortcuts} />
    </div>
  );
}
