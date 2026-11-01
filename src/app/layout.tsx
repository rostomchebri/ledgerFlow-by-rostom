import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LedgerFlow",
    template: "%s · LedgerFlow",
  },
  description:
    "Accounting productivity workspace for accountants and small firms — clients, documents, invoices and deadlines.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Locale/direction become dynamic in SETUP-05 (FR / AR / EN + RTL).
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans`}>{children}</body>
    </html>
  );
}
