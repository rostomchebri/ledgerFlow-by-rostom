"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, CheckCircle2, AlertTriangle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InvoiceTableRow = {
  id: string;
  number: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  total: number;
  currency: string;
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "border-slate-500/15 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  SENT: "border-blue-500/15 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  PAID: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  OVERDUE: "border-rose-500/15 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

type BulkAction = "send" | "paid" | "overdue";

export function InvoiceTable({
  rows,
  locale,
  canWrite,
}: {
  rows: InvoiceTableRow[];
  locale: string;
  canWrite: boolean;
}) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<BulkAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const amountFormatter = (currency: string) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "DZD",
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    }
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  async function runBulk(action: BulkAction) {
    if (selected.size === 0) return;
    setPending(action);
    setError(null);
    try {
      const response = await fetch("/api/invoices/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("bulk.failed"));
        return;
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      setError(t("bulk.failed"));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {canWrite && selected.size > 0 ? (
        <div className="glass-card flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3">
          <span className="text-sm font-medium">
            {t("bulk.selected", { count: selected.size })}
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending !== null}
              onClick={() => void runBulk("send")}
            >
              {pending === "send" ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {t("bulk.send")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending !== null}
              onClick={() => void runBulk("paid")}
            >
              {pending === "paid" ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {t("bulk.paid")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending !== null}
              onClick={() => void runBulk("overdue")}
            >
              {pending === "overdue" ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {t("bulk.overdue")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending !== null}
              onClick={() => setSelected(new Set())}
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              {t("bulk.clear")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {canWrite ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={t("table.selectAll")}
                      className="h-4 w-4 rounded border-[hsl(var(--border))]"
                    />
                  </th>
                ) : null}
                <th className="px-5 py-3 text-start font-medium">{t("table.number")}</th>
                <th className="px-3 py-3 text-start font-medium">{t("table.client")}</th>
                <th className="hidden px-3 py-3 text-start font-medium md:table-cell">
                  {t("table.issueDate")}
                </th>
                <th className="hidden px-3 py-3 text-start font-medium lg:table-cell">
                  {t("table.dueDate")}
                </th>
                <th className="hidden px-3 py-3 text-start font-medium sm:table-cell">
                  {t("table.status")}
                </th>
                <th className="px-5 py-3 text-end font-medium">{t("table.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={cn(
                    "border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]",
                    selected.has(invoice.id) && "bg-primary/[0.06]",
                  )}
                >
                  {canWrite ? (
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(invoice.id)}
                        onChange={() => toggle(invoice.id)}
                        aria-label={t("table.select", { number: invoice.number })}
                        className="h-4 w-4 rounded border-[hsl(var(--border))]"
                      />
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Link href={`/invoices/${invoice.id}`} className="font-semibold hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-3 py-3.5 text-muted-foreground">
                    {invoice.clientName}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground md:table-cell">
                    {dateFormatter.format(new Date(invoice.issueDate))}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground lg:table-cell">
                    {dateFormatter.format(new Date(invoice.dueDate))}
                  </td>
                  <td className="hidden px-3 py-3.5 sm:table-cell">
                    <Badge
                      className={cn(
                        "border font-medium",
                        STATUS_BADGES[invoice.status] ?? STATUS_BADGES.DRAFT,
                      )}
                    >
                      {t(`statuses.${invoice.status}`)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-end font-semibold tabular-nums">
                    {amountFormatter(invoice.currency).format(invoice.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
