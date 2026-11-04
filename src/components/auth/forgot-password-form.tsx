"use client";

import { ArrowRight, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-errors";
import { emailSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const tErrors = useTranslations("auth.errors");
  const [email, setEmail] = useState("");
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

    const { error } = await authClient.requestPasswordReset({
      email: email.trim().toLowerCase(),
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsPending(false);

    if (error) {
      setFormError(authErrorKey(error));
      return;
    }

    // Always show the same success screen, whether or not the address exists.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <Alert variant="success">
          <p className="font-medium">{t("successTitle")}</p>
          <p className="mt-1">{t("successBody")}</p>
        </Alert>

        <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="destructive">{tErrors(formError.replace("errors.", ""))}</Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">{t("emailLabel")}</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="forgot-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="ps-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "forgot-email-error" : undefined}
            required
          />
        </div>
        <FieldError id="forgot-email-error" message={fieldError} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        )}
        {isPending ? t("submitting") : t("submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
