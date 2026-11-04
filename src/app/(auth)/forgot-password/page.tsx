import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { requireGuest } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien de réinitialisation de votre mot de passe LedgerFlow.",
};

export default async function ForgotPasswordPage() {
  await requireGuest();

  const t = await getTranslations("auth.forgot");

  return (
    <AuthCard icon={KeyRound} title={t("title")} description={t("subtitle")}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
