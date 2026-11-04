"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const t = useTranslations("team");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!window.confirm(t("revokeConfirm"))) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/firms/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("revokeFailed"));
        return;
      }

      router.refresh();
    } catch {
      setError(t("revokeFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRevoke}
        disabled={pending}
        aria-label={t("revoke")}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {t("revoke")}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
