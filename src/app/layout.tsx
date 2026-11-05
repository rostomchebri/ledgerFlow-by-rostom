import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { localeDirections, type Locale } from "@/i18n/config";

import "./globals.css";

// Self-hosted variable fonts keep production builds independent of the
// Google Fonts CDN (which is unreachable in offline/CI environments).
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

const notoArabic = localFont({
  src: "./fonts/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-arabic",
  display: "swap",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
  };
}

/**
 * Applies the saved theme before first paint to avoid a light flash when the
 * user reloads in dark mode. Kept inline (and tiny) so it runs synchronously.
 */
const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("ledgerflow-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = localeDirections[locale] ?? "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} ${notoArabic.variable} min-h-screen font-sans`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div aria-hidden="true" className="ambient-backdrop">
            <span className="ambient-orb ambient-orb--1" />
            <span className="ambient-orb ambient-orb--2" />
            <span className="ambient-orb ambient-orb--3" />
            <span className="ambient-orb ambient-orb--4" />
            <span className="ambient-orb ambient-orb--5" />
          </div>
          <div className="relative z-10">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
