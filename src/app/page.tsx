import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";

import { LiquidGlassLogo } from "@/components/brand/liquid-glass-logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <span className="absolute -start-32 -top-40 h-[32rem] w-[32rem] rounded-full bg-[hsl(var(--canvas-glow-1)/0.2)] blur-3xl" />
        <span className="absolute -end-24 top-0 h-[26rem] w-[26rem] rounded-full bg-[hsl(var(--canvas-glow-2)/0.16)] blur-3xl" />
        <span className="absolute bottom-[-14rem] start-1/4 h-[30rem] w-[30rem] rounded-full bg-[hsl(var(--canvas-glow-3)/0.14)] blur-3xl" />
      </div>

      <header className="relative z-10 flex h-20 items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <LiquidGlassLogo size={36} priority />
          <span className="text-[15px] font-bold tracking-[-0.02em]">{tCommon("appName")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <section className="glass-card w-full max-w-3xl overflow-hidden rounded-[2rem] px-6 py-10 text-center sm:px-12 sm:py-14">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -end-20 -top-28 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -start-16 h-56 w-56 rounded-full bg-[hsl(var(--chart-4)/0.14)] blur-3xl"
          />

          <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            {t("badge")}
          </span>

          <h1 className="text-gradient mt-6 text-5xl font-bold tracking-[-0.045em] sm:text-6xl">
            {t("title")}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-7 text-muted-foreground">
            {t("description")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/clients" className={buttonVariants({ size: "lg" })}>
              <Users aria-hidden="true" className="h-4 w-4" />
              {t("openClients")}
              <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href="/clients/new"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {t("createClient")}
            </Link>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--border)/0.6)] pt-6 text-start sm:flex-row">
            <p className="max-w-md text-xs leading-5 text-muted-foreground">{t("note")}</p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck
                aria-hidden="true"
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              />
              {tCommon("appName")}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
