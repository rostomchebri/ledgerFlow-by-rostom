"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "ledgerflow-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing can reject localStorage; the in-memory state still works.
    }
  }

  const label = isDark ? t("themeLight") : t("themeDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "glass-icon-button h-9 w-9 border-[hsl(var(--border)/0.65)] bg-[hsl(var(--card)/0.45)]",
        className,
      )}
    >
      <span className="relative flex h-[18px] w-[18px] items-center justify-center">
        <Sun
          aria-hidden="true"
          className={cn(
            "absolute h-[18px] w-[18px] transition-all duration-300",
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
          )}
        />
        <Moon
          aria-hidden="true"
          className={cn(
            "absolute h-[18px] w-[18px] transition-all duration-300",
            isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
      </span>
    </button>
  );
}
