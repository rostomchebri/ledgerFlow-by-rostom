import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { requireGuest } from "@/lib/session";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez votre compte LedgerFlow.",
};

export default async function RegisterPage() {
  await requireGuest();

  const t = await getTranslations("auth.register");

  return (
    <AuthCard icon={UserPlus} title={t("title")} description={t("subtitle")}>
      <RegisterForm />
    </AuthCard>
  );
}
