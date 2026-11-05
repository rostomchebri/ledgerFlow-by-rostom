"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("clients.error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="glass-card mx-auto flex w-full max-w-2xl flex-col items-start gap-4 rounded-2xl p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button onClick={reset} variant="outline">
        <RotateCcw className="h-4 w-4 rtl:-scale-x-100" />
        {t("retry")}
      </Button>
    </div>
  );
}
