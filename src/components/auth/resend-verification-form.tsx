"use client";

import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorKey, isRateLimited } from "@/lib/auth-errors";
import { emailSchema } from "@/lib/validation/auth";

export function ResendVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const t = useTranslations("auth.verify");
  const tErrors = useTranslations("auth.errors");
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setFieldError(undefined);

    if (!emailSchema.safeParse(email).success) {
      setFieldError(tErrors("invalidEmail"));
      return;
    }

    setIsPending(true);

    const { error } = await authClient.sendVerificationEmail({
      email: email.trim().toLowerCase(),
      callbackURL: "/verify-email?verified=1",
    });

    setIsPending(false);

    if (error && isRateLimited(error)) {
      setFormError(authErrorKey(error));
      return;
    }

    // Deliberately generic: never reveal whether an account exists.
    setSent(true);
  }

  if (sent) {
    return <Alert variant="success">{t("resendSuccess")}</Alert>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="destructive">{tErrors(formError.replace("errors.", ""))}</Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="verify-email">{t("emailLabel")}</Label>
        <Input
          id="verify-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "verify-email-error" : undefined}
          required
        />
        <FieldError id="verify-email-error" message={fieldError} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Mail aria-hidden="true" className="h-4 w-4" />
        )}
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
