import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailCheck, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Vérification de l’e-mail",
  description: "Vérifiez votre adresse e-mail pour activer votre compte LedgerFlow.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("auth.verify");
  const params = await searchParams;
  const verified = first(params.verified) === "1";
  const hasError = Boolean(first(params.error));
  const email = first(params.email) ?? "";
  const session = await getSession();

  if (verified) {
    return (
      <AuthCard icon={CheckCircle2} title={t("successTitle")} description={t("successBody")}>
        <Link
          href={session ? "/dashboard" : "/login?verified=1"}
          className={buttonVariants({ className: "w-full" })}
        >
          {session ? t("goToDashboard") : t("goToDashboard")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={hasError ? ShieldAlert : MailCheck}
      title={hasError ? t("errorTitle") : t("title")}
      description={hasError ? t("errorBody") : t("subtitle")}
    >
      <div className="space-y-5">
        {hasError ? <Alert variant="destructive">{t("errorBody")}</Alert> : null}

        <div className="space-y-1">
          <p className="text-sm font-medium">{t("resendTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("resendBody")}</p>
        </div>

        <ResendVerificationForm initialEmail={email} />

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
