import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace LedgerFlow.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const t = await getTranslations("auth.login");
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(params.callbackUrl);
  const notice =
    first(params.verified) === "1"
      ? "verified"
      : first(params.reset) === "1"
        ? "reset"
        : first(params.registered) === "1"
          ? "registered"
          : undefined;

  return (
    <AuthCard icon={LogIn} title={t("title")} description={t("subtitle")}>
      <LoginForm callbackUrl={callbackUrl} notice={notice} />
    </AuthCard>
  );
}
