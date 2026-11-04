import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { ClientForm } from "@/components/clients/client-form";
import { clientToFormValues } from "@/lib/clients/form";
import { getClient } from "@/lib/clients/service";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { clientDetailRoute } from "@/lib/client-routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clients.meta");
  return {
    title: t("editTitle"),
    description: t("editDescription"),
  };
}

type EditClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const { firmId, role } = await requireFirmContext();

  if (!can(role, "client.write")) redirect(clientDetailRoute(id));

  const client = await getClient(firmId, id);

  if (!client) notFound();

  const t = await getTranslations("clients.edit");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-3">
        <Link
          href={clientDetailRoute(client.id)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          {t("back", { name: client.name })}
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <ClientForm mode="edit" clientId={client.id} initialValues={clientToFormValues(client)} />
    </div>
  );
}
