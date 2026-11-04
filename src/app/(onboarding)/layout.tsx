import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { requireSession } from "@/lib/session";

/**
 * FIRM-01 — onboarding lives outside the `(app)` group because it must stay
 * reachable for signed-in users who do not have a workspace yet.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const t = await getTranslations("onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              LF
            </span>
            <span className="text-sm font-semibold">LedgerFlow</span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <SignOutButton className="px-2" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      <footer className="pb-6 text-center text-xs text-muted-foreground">{t("footer")}</footer>
    </div>
  );
}
