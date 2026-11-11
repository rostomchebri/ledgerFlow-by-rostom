import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/clients/format";
import { listFirmMembers } from "@/lib/firms/invitations";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.meta");
  return { title: t("title"), description: t("description") };
}

export default async function SettingsPage() {
  const { user } = await requireSession();
  const { firmId, firmName, firmSlug, role } = await requireFirmContext();
  const t = await getTranslations("settings");
  const tRoles = await getTranslations("roles");
  const tTeam = await getTranslations("team");
  const tShell = await getTranslations("shell");
  const locale = await getLocale();
  const members = await listFirmMembers(firmId);

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <Users aria-hidden="true" className="h-4 w-4" />
              </span>
              {t("profileTitle")}
            </CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-br from-primary via-primary to-[hsl(var(--chart-4))] text-lg font-bold text-primary-foreground shadow-[0_12px_28px_-12px_hsl(var(--primary)/0.85),inset_0_1px_0_rgba(255,255,255,0.35)]">
                {initials || "LF"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{user.name}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  {user.email}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-t pt-3">
                <dt className="text-muted-foreground">{t("role")}</dt>
                <dd>
                  <Badge variant={role === "OWNER" ? "success" : "outline"}>{tRoles(role)}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                  {t("memberSince")}
                </dt>
                <dd className="font-medium">{formatDate(user.createdAt, locale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-3">
                <dt className="text-muted-foreground">{t("email")}</dt>
                <dd>
                  <Badge variant={user.emailVerified ? "success" : "muted"}>
                    {user.emailVerified ? (
                      <CheckCircle2 aria-hidden="true" className="me-1 h-3 w-3" />
                    ) : (
                      <Clock aria-hidden="true" className="me-1 h-3 w-3" />
                    )}
                    {user.emailVerified ? t("verified") : t("unverified")}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Building2 aria-hidden="true" className="h-4 w-4" />
              </span>
              {t("workspaceTitle")}
            </CardTitle>
            <CardDescription>{t("workspaceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("firmName")}
                </dt>
                <dd className="mt-1 text-base font-semibold">{firmName}</dd>
              </div>
              <div className="border-t pt-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("slug")}
                </dt>
                <dd className="mt-1 truncate font-mono text-sm text-muted-foreground">
                  ledgerflow.app/{firmSlug}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-3">
                <dt className="text-muted-foreground">{t("members")}</dt>
                <dd className="flex items-center gap-2 font-medium">
                  <Users aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  {members.length}
                </dd>
              </div>
            </dl>

            <Link
              href="/settings/team"
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-auto w-full justify-between gap-3 whitespace-normal rounded-xl py-2.5 text-start",
              })}
            >
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span>{t("teamTitle")}</span>
                <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
                  {t("teamDescription")}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-300">
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              </span>
              {t("preferencesTitle")}
            </CardTitle>
            <CardDescription>{t("preferencesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t("theme")}</p>
                <p className="text-xs text-muted-foreground">{t("themeHint")}</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t("language")}</p>
                <p className="text-xs text-muted-foreground">{t("languageHint")}</p>
              </div>
              <LocaleSwitcher className="min-w-44 justify-between" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              </span>
              {t("securityTitle")}
            </CardTitle>
            <CardDescription>{t("securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[t("securityEmail"), t("securityRate"), t("securitySession")].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {tShell("signedInAs")} · {user.email}
            </p>
          </CardContent>
        </Card>
      </div>

      <Link
        href="/settings/team"
        className="glass-card glass-card-hover flex items-center justify-between gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <Users aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{tTeam("title")}</span>
            <span className="block text-xs text-muted-foreground">{tTeam("description")}</span>
          </span>
        </span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground rtl:-scale-x-100" />
      </Link>

      {can(role, "audit.read") ? (
        <Link
          href="/settings/audit"
          className="glass-card glass-card-hover flex items-center justify-between gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <ScrollText aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{t("auditTitle")}</span>
              <span className="block text-xs text-muted-foreground">{t("auditDescription")}</span>
            </span>
          </span>
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground rtl:-scale-x-100" />
        </Link>
      ) : null}
    </div>
  );
}
