import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/clients/format";
import { db } from "@/lib/db";
import { requireFirmContext } from "@/lib/firm-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports.invoiceRegister.meta");
  return { title: t("title"), description: t("description") };
}

function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function InvoiceRegisterPage() {
  const t = await getTranslations("reports.invoiceRegister");
  const locale = await getLocale();
  const { firmId } = await requireFirmContext();

  const [invoices, grouped, totals] = await Promise.all([
    db.invoice.findMany({
      where: { firmId },
      include: { client: { select: { name: true } } },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: 200,
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { firmId },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: { firmId },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  const byStatus = (["DRAFT", "SENT", "PAID", "OVERDUE"] as const).map((status) => {
    const row = grouped.find((entry) => entry.status === status);
    return {
      status,
      count: row?._count._all ?? 0,
      total: row?._sum.total ? Number(row._sum.total) : 0,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <Link href="/reports" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
            />
            {t("eyebrow")}
          </p>
          <h1 className="text-gradient text-[30px] font-bold leading-tight tracking-[-0.04em] sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/api/reports/invoices/export" className={buttonVariants({ variant: "default" })}>
          <Download aria-hidden="true" className="h-4 w-4" />
          {t("export")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {byStatus.map((entry) => (
          <div key={entry.status} className="glass-card rounded-2xl p-5">
            <p className="text-sm font-medium text-muted-foreground">
              {t(`statuses.${entry.status}`)}
            </p>
            <p className="mt-1 truncate text-[26px] font-bold tabular-nums tracking-[-0.03em]">
              {money(entry.total, locale)}
            </p>
            <p className="text-xs text-muted-foreground">{t("count", { count: entry.count })}</p>
          </div>
        ))}
      </section>

      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
        <p className="text-sm text-muted-foreground">{t("totalLabel")}</p>
        <p className="text-xl font-bold tabular-nums">
          {money(totals._sum.total ? Number(totals._sum.total) : 0, locale)}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("count", { count: totals._count._all })}
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{t("tableTitle")}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="px-5 py-3 text-start font-medium">{t("columns.number")}</th>
                <th className="px-3 py-3 text-start font-medium">{t("columns.client")}</th>
                <th className="hidden px-3 py-3 text-start font-medium md:table-cell">
                  {t("columns.issued")}
                </th>
                <th className="hidden px-3 py-3 text-start font-medium lg:table-cell">
                  {t("columns.due")}
                </th>
                <th className="hidden px-3 py-3 text-start font-medium sm:table-cell">
                  {t("columns.status")}
                </th>
                <th className="px-5 py-3 text-end font-medium">{t("columns.total")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]"
                >
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Link href={`/invoices/${invoice.id}`} className="font-semibold hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-3 py-3.5 text-muted-foreground">
                    {invoice.client.name}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground md:table-cell">
                    {formatDate(invoice.issueDate, locale)}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground lg:table-cell">
                    {formatDate(invoice.dueDate, locale)}
                  </td>
                  <td className="hidden px-3 py-3.5 sm:table-cell">
                    <Badge variant="outline">{t(`statuses.${invoice.status}`)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-end font-semibold tabular-nums">
                    {money(Number(invoice.total), locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardContent className="border-t py-3">
          <p className="text-xs text-muted-foreground">{t("limitHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
