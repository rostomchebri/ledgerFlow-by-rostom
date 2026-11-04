import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/i18n/locale-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth.common");
  const tCommon = await getTranslations("common");

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent"
      />

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            LF
          </span>
          <span className="text-sm font-semibold tracking-tight">{tCommon("appName")}</span>
        </Link>
        <LocaleSwitcher />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="relative z-10 px-4 pb-6 text-center text-xs text-muted-foreground">
        {t("secureNote")}
      </footer>
    </div>
  );
}
