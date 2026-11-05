import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Pencil,
  ReceiptText,
  UserRound,
} from "lucide-react";

import { InvoiceDeleteButton } from "@/components/invoices/invoice-delete-button";
import { InvoiceStatusActions } from "@/components/invoices/invoice-status-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/clients/format";
import { requireFirmContext } from "@/lib/firm-context";
import { getInvoice } from "@/lib/invoices/service";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type InvoiceDetailPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: InvoiceDetailPageProps): Promise<Metadata> {
  const { firmId } = await requireFirmContext();
  const { id } = await params;
  const invoice = await getInvoice(firmId, id);
  const t = await getTranslations("invoices.detail");
  return { title: invoice?.number ?? t("fallbackTitle") };
}

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "border-slate-500/15 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  SENT: "border-blue-500/15 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  PAID: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  OVERDUE: "border-rose-500/15 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function money(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "DZD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const t = await getTranslations("invoices.detail");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const { id } = await params;
  const invoice = await getInvoice(firmId, id);
  if (!invoice) notFound();

  const canWrite = can(role, "invoice.write");
  const isDraft = invoice.status === "DRAFT";
  const currency = invoice.currency;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <>
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  {t("edit")}
                </Link>
                <InvoiceDeleteButton invoiceId={invoice.id} />
              </>
            ) : null}
            <a
              href="/api/reports/invoices/export"
              className={buttonVariants({ variant: "outline" })}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("exportRegister")}
            </a>
          </div>
        ) : null}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Badge className={cn("border font-medium", STATUS_BADGES[invoice.status])}>
              {t(`statuses.${invoice.status}`)}
            </Badge>
            <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight tracking-[-0.035em]">
              <ReceiptText aria-hidden="true" className="h-6 w-6 text-primary" />
              {invoice.number}
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound aria-hidden="true" className="h-4 w-4" />
              {invoice.client.name}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {t("total")}
            </p>
            <p className="text-2xl font-bold tabular-nums tracking-[-0.03em]">
              {money(Number(invoice.total), currency, locale)}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[hsl(var(--border)/0.55)] pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
              {t("issued")}
            </dt>
            <dd className="font-medium">{formatDate(invoice.issueDate, locale)}</dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
              {t("due")}
            </dt>
            <dd className="font-medium">{formatDate(invoice.dueDate, locale)}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">{t("currency")}</dt>
            <dd className="font-medium">{currency}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">{t("status")}</dt>
            <dd className="font-medium">{t(`statuses.${invoice.status}`)}</dd>
          </div>
        </dl>

        {canWrite ? (
          <div className="mt-5 border-t border-[hsl(var(--border)/0.55)] pt-5">
            <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} />
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{t("linesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border)/0.55)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="py-2 pe-3 text-start font-medium">{t("description")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("quantity")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("unitPrice")}</th>
                  <th className="ps-3 py-2 text-end font-medium">{t("lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((line) => (
                  <tr key={line.id} className="border-b border-[hsl(var(--border)/0.45)] last:border-0">
                    <td className="max-w-64 truncate py-3 pe-3">{line.description}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-end tabular-nums">
                      {Number(line.quantity)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-end tabular-nums">
                      {money(Number(line.unitPrice), currency, locale)}
                    </td>
                    <td className="whitespace-nowrap ps-3 py-3 text-end font-semibold tabular-nums">
                      {money(Number(line.lineTotal), currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 ms-auto flex w-full max-w-xs flex-col gap-1.5 border-t border-[hsl(var(--border)/0.55)] pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span className="tabular-nums">{money(Number(invoice.subtotal), currency, locale)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>{t("total")}</span>
              <span className="tabular-nums">{money(Number(invoice.total), currency, locale)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
