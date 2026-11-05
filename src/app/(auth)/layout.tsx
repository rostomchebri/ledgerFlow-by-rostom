import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";

import { LiquidGlassLogo } from "@/components/brand/liquid-glass-logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth.common");
  const tCommon = await getTranslations("common");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <span className="absolute -start-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(var(--canvas-glow-1)/0.18)] blur-3xl" />
        <span className="absolute -end-28 top-10 h-[24rem] w-[24rem] rounded-full bg-[hsl(var(--canvas-glow-2)/0.16)] blur-3xl" />
        <span className="absolute bottom-[-12rem] start-1/3 h-[26rem] w-[26rem] rounded-full bg-[hsl(var(--canvas-glow-3)/0.14)] blur-3xl" />
      </div>

      <header className="relative z-10 flex h-20 items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <LiquidGlassLogo size={36} />
          <span className="text-[15px] font-bold tracking-[-0.02em]">{tCommon("appName")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[27rem]">{children}</div>
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-2 px-4 pb-8 text-center text-xs text-muted-foreground">
        <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
          <ShieldCheck
            aria-hidden="true"
            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
          />
          {t("secureNote")}
        </span>
        <span>© {new Date().getFullYear()} LedgerFlow</span>
      </footer>
    </div>
  );
}
