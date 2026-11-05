"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FirmRole } from "@/lib/rbac";

type InviteMemberFormProps = {
  roles: readonly FirmRole[];
};

export function InviteMemberForm({ roles }: InviteMemberFormProps) {
  const router = useRouter();
  const t = useTranslations("team.invite");
  const tRoles = useTranslations("roles");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FirmRole>(roles[0] ?? "ACCOUNTANT");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);
    setFormError(undefined);
    setSuccess(undefined);

    if (!email.trim()) {
      setFieldError(t("emailRequired"));
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/firms/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string; details?: { fields?: Record<string, string> } };
      } | null;

      if (!response.ok) {
        setFieldError(body?.error?.details?.fields?.email);
        setFormError(body?.error?.message ?? t("failed"));
        return;
      }

      setSuccess(t("success", { email: email.trim().toLowerCase() }));
      setEmail("");
      router.refresh();
    } catch {
      setFormError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <Alert variant="destructive">
          <p>{formError}</p>
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success">
          <p className="flex items-start gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {success}
          </p>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">{t("emailLabel")}</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            maxLength={254}
            autoComplete="email"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "invite-email-error" : undefined}
            required
          />
          {fieldError ? (
            <p id="invite-email-error" className="text-xs text-destructive">
              {fieldError}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-role">{t("roleLabel")}</Label>
          <Select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as FirmRole)}
          >
            {roles.map((option) => (
              <option key={option} value={option}>
                {tRoles(option)}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </form>
  );
}
