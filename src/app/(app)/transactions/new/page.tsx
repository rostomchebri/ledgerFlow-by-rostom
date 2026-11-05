import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { EMPTY_TRANSACTION_FORM_VALUES } from "@/lib/transactions/form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("transactions.newPage");
  return { title: t("title"), description: t("description") };
}

export default async function NewTransactionPage() {
  const t = await getTranslations("transactions.newPage");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "client.write")) redirect("/transactions");

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
        mode="create"
        initialValues={EMPTY_TRANSACTION_FORM_VALUES}
        clients={clients}
      />
    </div>
  );
}
