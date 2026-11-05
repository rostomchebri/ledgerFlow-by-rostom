import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { ClientForm } from "@/components/clients/client-form";
import { EMPTY_CLIENT_FORM_VALUES } from "@/lib/clients/form";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clients.meta");
  return {
    title: t("newTitle"),
    description: t("newDescription"),
  };
}

export default async function NewClientPage() {
  const { role } = await requireFirmContext();
  if (!can(role, "client.write")) redirect("/clients");

  const t = await getTranslations("clients.new");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
        <div className="space-y-1">
          <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <ClientForm mode="create" initialValues={EMPTY_CLIENT_FORM_VALUES} />
    </div>
  );
}
