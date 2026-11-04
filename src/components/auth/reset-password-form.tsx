"use client";

import { ArrowRight, KeyRound, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FieldError } from "@/components/auth/field-error";
import { PasswordHints } from "@/components/auth/password-hints";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorKey, isInvalidToken } from "@/lib/auth-errors";
import { getPasswordIssues, PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const tErrors = useTranslations("auth.errors");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [invalidToken, setInvalidToken] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function validate() {
    const errors: Record<string, string | undefined> = {};

    if (getPasswordIssues(password).length > 0) errors.password = tErrors("weakPassword");
    if (password !== confirmPassword) errors.confirmPassword = t("passwordsDoNotMatch");

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    if (!validate()) return;

    setIsPending(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setIsPending(false);

    if (error) {
      if (isInvalidToken(error)) {
        setInvalidToken(true);
        return;
      }

      setFormError(authErrorKey(error));
      return;
    }

    setSuccess(true);
  }

  if (invalidToken) {
    return (
      <div className="space-y-5">
        <Alert variant="destructive">
          <p className="font-medium">{t("invalidTitle")}</p>
          <p className="mt-1">{t("invalidBody")}</p>
        </Alert>
        <Link
          href="/forgot-password"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          {t("requestNew")}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-5">
        <Alert variant="success">
          <p className="font-medium">{t("successTitle")}</p>
          <p className="mt-1">{t("successBody")}</p>
        </Alert>
        <Link href="/login?reset=1" className={buttonVariants({ className: "w-full" })}>
          {t("backToLogin")}
          <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
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
        <Label htmlFor="reset-password">{t("passwordLabel")}</Label>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="reset-password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            className="ps-9"
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="reset-password-hint"
            required
          />
        </div>
        {password.length > 0 ? <PasswordHints password={password} /> : null}
        <FieldError id="reset-password-hint" message={fieldErrors.password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm-password">{t("confirmPasswordLabel")}</Label>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="reset-confirm-password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={t("confirmPasswordPlaceholder")}
            className="ps-9"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={
              fieldErrors.confirmPassword ? "reset-confirm-password-error" : undefined
            }
            required
          />
        </div>
        <FieldError id="reset-confirm-password-error" message={fieldErrors.confirmPassword} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound aria-hidden="true" className="h-4 w-4" />
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
