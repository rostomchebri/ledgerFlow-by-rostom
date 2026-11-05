import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireFirmContext } from "@/lib/firm-context";
import { invoiceToFormValues } from "@/lib/invoices/form";
import { getInvoice } from "@/lib/invoices/service";
import { can } from "@/lib/rbac";

type EditInvoicePageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: EditInvoicePageProps): Promise<Metadata> {
  const t = await getTranslations("invoices.editPage");
  const { firmId } = await requireFirmContext();
  const { id } = await params;
  const invoice = await getInvoice(firmId, id);
  return { title: invoice ? `${t("title")} · ${invoice.number}` : t("title") };
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const t = await getTranslations("invoices.editPage");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "invoice.write")) redirect("/invoices");

  const { id } = await params;
  const invoice = await getInvoice(firmId, id);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${invoice.id}`);

  const clients = await db.client.findMany({
    where: { firmId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href={`/invoices/${invoice.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>
      <div className="space-y-2">
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description", { number: invoice.number })}</p>
      </div>
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        initialValues={invoiceToFormValues(invoice)}
        clients={clients}
      />
    </div>
  );
}
