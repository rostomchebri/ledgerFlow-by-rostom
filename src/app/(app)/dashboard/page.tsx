import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Mail, ShieldCheck, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tableau de bord",
  description: "Votre espace de travail LedgerFlow.",
};

export default async function DashboardPage() {
  const { user, session } = await requireSession();
  const t = await getTranslations("dashboard");
  const locale = await getLocale();

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("title")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("welcome", { name: user.name })}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Link href="/clients" className={buttonVariants({ className: "self-start sm:self-auto" })}>
          <Users aria-hidden="true" className="h-4 w-4" />
          {t("openClients")}
          <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
              {initials || "LF"}
            </span>
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate">{user.name}</CardTitle>
              <CardDescription className="truncate">{user.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("statusLabel")}</span>
              <Badge variant={user.emailVerified ? "success" : "muted"}>
                {user.emailVerified ? (
                  <CheckCircle2 aria-hidden="true" className="me-1 h-3 w-3" />
                ) : (
                  <Clock aria-hidden="true" className="me-1 h-3 w-3" />
                )}
                {user.emailVerified ? t("verified") : t("unverified")}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("memberSince")}</span>
              <span>{dateFormatter.format(new Date(user.createdAt))}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("sessionExpires")}</span>
              <span>{dateTimeFormatter.format(new Date(session.expiresAt))}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
              {t("securityTitle")}
            </CardTitle>
            <CardDescription>{t("securityBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                />
                {t("securityItemVerify")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                />
                {t("securityItemRateLimit")}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                />
                {t("securityItemSession")}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("quickTitle")}</CardTitle>
          <CardDescription>{t("quickBody")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/clients" className={buttonVariants({ variant: "outline" })}>
            <Users aria-hidden="true" className="h-4 w-4" />
            {t("openClients")}
          </Link>
          <a href={`mailto:${user.email}`} className={buttonVariants({ variant: "ghost" })}>
            <Mail aria-hidden="true" className="h-4 w-4" />
            {user.email}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
