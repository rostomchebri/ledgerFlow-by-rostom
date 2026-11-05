"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TaskDeleteButton({ taskId }: { taskId: string }) {
  const t = useTranslations("tasks.delete");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(t("confirm"))) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }
      router.push("/tasks");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" onClick={() => void remove()} disabled={pending}>
        {pending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" />
        )}
        <span className="text-destructive">{t("button")}</span>
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
