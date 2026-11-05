"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID", "OVERDUE"],
  OVERDUE: ["PAID"],
  PAID: [],
};

/** INVOICE-05 — advance an invoice through its allowed status transitions. */
export function InvoiceStatusActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const t = useTranslations("invoices.detail");
  const router = useRouter();
  const [pending, setPending] = useState<InvoiceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = TRANSITIONS[status];

  async function change(next: InvoiceStatus) {
    setPending(next);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("statusFailed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("statusFailed"));
    } finally {
      setPending(null);
    }
  }

  if (options.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === "PAID" ? "default" : "outline"}
            disabled={pending !== null}
            onClick={() => void change(option)}
          >
            {pending === option ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : option === "SENT" ? (
              <Send aria-hidden="true" className="h-4 w-4" />
            ) : option === "PAID" ? (
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            )}
            {option === "SENT"
              ? t("markSent")
              : option === "PAID"
                ? t("markPaid")
                : t("markOverdue")}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
