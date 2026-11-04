import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Building2, CheckCircle2 } from "lucide-react";

import { OnboardingForm } from "@/components/firms/onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirmContext } from "@/lib/firm-context";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.meta");
  return { title: t("title"), description: t("description") };
}

export default async function OnboardingPage() {
  const context = await getFirmContext();
  if (context) redirect("/dashboard");

  const { user } = await requireSession();
  const t = await getTranslations("onboarding");

  const benefits = [t("benefitClients"), t("benefitTeam"), t("benefitAudit")];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>{t("form.title")}</CardTitle>
            <CardDescription>{t("form.description")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <OnboardingForm userName={user.name} />
        </CardContent>
      </Card>

      <ul className="space-y-2 text-sm text-muted-foreground">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}
