import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <main className="container relative flex min-h-screen flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="absolute end-4 top-4 sm:end-8 sm:top-8">
        <LocaleSwitcher />
      </div>

      <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {t("badge")}
      </span>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>

      <p className="max-w-xl text-balance text-muted-foreground">{t("description")}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/clients" className={buttonVariants({ size: "lg" })}>
          <Users className="h-4 w-4" />
          {t("openClients")}
          <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
        <Link href="/clients/new" className={buttonVariants({ size: "lg", variant: "outline" })}>
          {t("createClient")}
        </Link>
      </div>

      <p className="max-w-xl text-sm text-muted-foreground">{t("note")}</p>
    </main>
  );
}
