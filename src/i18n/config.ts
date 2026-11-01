/**
 * i18n configuration (SETUP-05).
 *
 * Locales are resolved from the NEXT_LOCALE cookie instead of a URL prefix, so
 * existing routes stay unchanged (`/clients` stays `/clients` in every language).
 * Add a locale here and create `messages/<locale>.json` — everything else follows.
 */
export const locales = ["fr", "ar", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  fr: "ltr",
  ar: "rtl",
  en: "ltr",
};

/** Native names — always displayed in their own script in the switcher. */
export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Falls back to the default locale for unknown cookie values. */
export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}
