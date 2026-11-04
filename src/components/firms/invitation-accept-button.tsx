"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserPlus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function InvitationAcceptButton({ token }: { token: string }) {
  const t = useTranslations("team.accept");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      ) : null}

      <Button type="button" onClick={handleAccept} disabled={pending} className="w-full" size="lg">
        {pending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus aria-hidden="true" className="h-4 w-4" />
        )}
        {pending ? t("accepting") : t("accept")}
      </Button>
    </div>
  );
}
