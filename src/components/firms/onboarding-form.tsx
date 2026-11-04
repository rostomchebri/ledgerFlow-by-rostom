"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Building2, Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateFirmResponse = {
  data?: { id?: string };
  error?: { message?: string; details?: { fields?: Record<string, string> } };
};

export function OnboardingForm({ userName }: { userName: string }) {
  const t = useTranslations("onboarding.form");
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setFieldError(undefined);

    if (name.trim().length < 2) {
      setFieldError(t("nameRequired"));
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const body = (await response.json().catch(() => null)) as CreateFirmResponse | null;

      if (!response.ok) {
        setFieldError(body?.error?.details?.fields?.name);
        setFormError(
          body?.error?.message ?? (response.status === 409 ? t("alreadyJoined") : t("saveFailed")),
        );
        return;
      }

      // Full navigation so the new membership is visible to the server layout.
      window.location.assign("/dashboard");
    } catch {
      setFormError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <Alert variant="destructive">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="firm-name">{t("nameLabel")}</Label>
        <div className="relative">
          <Building2
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="firm-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            className="ps-9"
            maxLength={120}
            autoComplete="organization"
            autoFocus
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "firm-name-error" : "firm-name-hint"}
            required
          />
        </div>
        {fieldError ? (
          <p id="firm-name-error" className="text-xs text-destructive">
            {fieldError}
          </p>
        ) : (
          <p id="firm-name-hint" className="text-xs text-muted-foreground">
            {t("nameHint", { name: userName })}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
