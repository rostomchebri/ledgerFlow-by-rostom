import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("documents.upload");
  return { title: t("title"), description: t("pageDescription") };
}

export default async function NewDocumentPage() {
  const t = await getTranslations("documents.upload");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "document.write")) redirect("/documents");

  const clients = await db.client.findMany({
    where: { firmId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>
      <div className="space-y-2">
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>
      <DocumentUploadForm clients={clients} />
    </div>
  );
}
