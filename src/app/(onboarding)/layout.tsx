import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LiquidGlassLogo } from "@/components/brand/liquid-glass-logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { requireSession } from "@/lib/session";

/**
 * FIRM-01 — onboarding lives outside the `(app)` group because it must stay
 * reachable for signed-in users who do not have a workspace yet.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const t = await getTranslations("onboarding");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <span className="absolute -start-28 -top-36 h-[30rem] w-[30rem] rounded-full bg-[hsl(var(--canvas-glow-1)/0.17)] blur-3xl" />
        <span className="absolute -end-24 top-16 h-[24rem] w-[24rem] rounded-full bg-[hsl(var(--canvas-glow-2)/0.14)] blur-3xl" />
      </div>

      <header className="glass-bar relative z-10">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LiquidGlassLogo size={32} />
            <span className="text-sm font-bold tracking-[-0.02em]">LedgerFlow</span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <SignOutButton className="px-2" />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg animate-fade-up">{children}</div>
      </main>

      <footer className="relative z-10 px-4 pb-6 text-center text-xs text-muted-foreground">
        {t("footer")}
      </footer>
    </div>
  );
}
