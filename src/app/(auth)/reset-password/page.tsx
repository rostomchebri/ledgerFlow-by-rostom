import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  description: "Choisissez un nouveau mot de passe pour votre compte LedgerFlow.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("auth.reset");
  const params = await searchParams;
  const token = first(params.token);
  const error = first(params.error);

  if (!token || error) {
    return (
      <AuthCard icon={KeyRound} title={t("invalidTitle")} description={t("invalidBody")}>
        <div className="space-y-5">
          <Alert variant="destructive">{t("invalidBody")}</Alert>
          <Link
            href="/forgot-password"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            {t("requestNew")}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={KeyRound} title={t("title")} description={t("subtitle")}>
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
