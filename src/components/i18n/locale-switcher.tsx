"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeDirections,
  localeLabels,
  locales,
  type Locale,
} from "@/i18n/config";

/**
 * Cookie-based locale switcher (SETUP-05).
 *
 * No URL prefix: the cookie is read by `src/i18n/request.ts`, then a soft
 * refresh re-renders the server tree with the new locale and direction.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;

    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = localeDirections[next];

    startTransition(() => router.refresh());
  }

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-sm transition-opacity",
        isPending && "opacity-60",
        className,
      )}
    >
      <Globe aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={handleChange}
        disabled={isPending}
        aria-label={t("language")}
        className="cursor-pointer bg-transparent text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {locales.map((value) => (
          <option key={value} value={value} lang={value}>
            {localeLabels[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
