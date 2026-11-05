"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** DOC-06 — soft delete / restore from the library row. */
export function DocumentArchiveButton({
  documentId,
  archived,
}: {
  documentId: string;
  archived: boolean;
}) {
  const t = useTranslations("documents.archive");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!window.confirm(archived ? t("restoreConfirm") : t("confirm"))) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        archived ? `/api/documents/${documentId}/restore` : `/api/documents/${documentId}`,
        { method: archived ? "POST" : "DELETE" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void run()}
        disabled={pending}
        title={archived ? t("restore") : t("button")}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : archived ? (
          <ArchiveRestore aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">{archived ? t("restore") : t("button")}</span>
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
