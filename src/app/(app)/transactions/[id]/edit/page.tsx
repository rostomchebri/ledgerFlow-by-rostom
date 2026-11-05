import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { transactionToFormValues } from "@/lib/transactions/form";
import { getTransaction } from "@/lib/transactions/service";

type EditTransactionPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("transactions.editPage");
  return { title: t("title"), description: t("description") };
}

export default async function EditTransactionPage({ params }: EditTransactionPageProps) {
  const t = await getTranslations("transactions.editPage");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "client.write")) redirect("/transactions");

  const { id } = await params;
  const transaction = await getTransaction(firmId, id);
  if (!transaction) notFound();

  const clients = await db.client.findMany({
    where: { firmId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/transactions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>
      <div className="space-y-2">
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <TransactionForm
        mode="edit"
        transactionId={transaction.id}
        initialValues={transactionToFormValues(transaction)}
        clients={clients}
      />
    </div>
  );
}
