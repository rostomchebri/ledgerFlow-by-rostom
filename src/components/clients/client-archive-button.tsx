"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ClientArchiveButtonProps = {
  clientId: string;
  archived: boolean;
};

/**
 * CLIENT-05 — archive / restore. The button is only rendered for roles with
 * the `client.archive` permission; the API enforces it again.
 */
export function ClientArchiveButton({ clientId, archived }: ClientArchiveButtonProps) {
  const router = useRouter();
  const t = useTranslations("clients.archive");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(archived ? t("restoreConfirm") : t("archiveConfirm"));
    if (!confirmed) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        archived ? `/api/clients/${clientId}/restore` : `/api/clients/${clientId}`,
        { method: archived ? "POST" : "DELETE" },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }

      if (archived) {
        router.refresh();
      } else {
        router.push("/clients");
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
        className="self-start"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : archived ? (
          <ArchiveRestore aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Archive aria-hidden="true" className="h-4 w-4" />
        )}
        {archived ? t("restore") : t("archive")}
      </Button>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
