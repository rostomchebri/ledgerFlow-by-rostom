"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TransactionDeleteButton({ transactionId }: { transactionId: string }) {
  const t = useTranslations("transactions.delete");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(t("confirm"))) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => void remove()}
        title={t("button")}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5 text-destructive" />
        )}
        <span className="sr-only">{t("button")}</span>
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
