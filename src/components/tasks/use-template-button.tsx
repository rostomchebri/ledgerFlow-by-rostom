"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const t = useTranslations("tasks.templatesPage");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function use() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/templates/${templateId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as {
        data?: { id?: string };
        error?: { message?: string };
      } | null;

      if (!response.ok || !body?.data?.id) {
        setError(body?.error?.message ?? t("useFailed"));
        return;
      }

      router.push(`/tasks/${body.data.id}`);
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
        size="sm"
        variant="outline"
        onClick={() => void use()}
        disabled={pending}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {t("use")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
