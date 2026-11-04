"use client";

import { ArrowRight, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";
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
import { authErrorKey } from "@/lib/auth-errors";
import {
  emailSchema,
  getPasswordIssues,
  nameSchema,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation/auth";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tErrors = useTranslations("auth.errors");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [isPending, setIsPending] = useState(false);

  function validate() {
    const errors: Record<string, string | undefined> = {};

    if (!nameSchema.safeParse(name).success) errors.name = tErrors("nameTooShort");
    if (!emailSchema.safeParse(email).success) errors.email = tErrors("invalidEmail");

    if (getPasswordIssues(password).length > 0) {
      errors.password = tErrors("weakPassword");
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = t("passwordsDoNotMatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    if (!validate()) return;

    setIsPending(true);

    const { error } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      callbackURL: "/verify-email?verified=1",
    });

    setIsPending(false);

    if (error) {
      setFormError(authErrorKey(error));
      return;
    }

    // Better Auth intentionally returns a generic success response when the
    // address already exists, so this screen never reveals account existence.
    setCreatedEmail(email.trim().toLowerCase());
  }

  async function handleResend() {
    if (!createdEmail) return;

    setResendState("sending");

    const { error } = await authClient.sendVerificationEmail({
      email: createdEmail,
      callbackURL: "/verify-email?verified=1",
    });

    setResendState(error ? "idle" : "sent");

    if (error) setFormError(authErrorKey(error));
  }

  if (createdEmail) {
    return (
      <div className="space-y-5">
        <Alert variant="success">
          <p className="font-medium">{t("successTitle")}</p>
          <p className="mt-1">{t("successBody", { email: createdEmail })}</p>
        </Alert>

        {resendState === "sent" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MailCheck aria-hidden="true" className="h-4 w-4" />
            {t("resendSuccess")}
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resendState === "sending"}
          >
            {resendState === "sending" ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Mail aria-hidden="true" className="h-4 w-4" />
            )}
            {t("resendVerification")}
          </Button>
        )}

        <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  const showPasswordHints = password.length > 0;

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="destructive">{tErrors(formError.replace("errors.", ""))}</Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="register-name">{t("nameLabel")}</Label>
        <div className="relative">
          <User
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className="ps-9"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
            required
          />
        </div>
        <FieldError id="register-name-error" message={fieldErrors.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-email">{t("emailLabel")}</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="register-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="ps-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            required
          />
        </div>
        <FieldError id="register-email-error" message={fieldErrors.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-password">{t("passwordLabel")}</Label>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="register-password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            className="ps-9"
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="register-password-hint"
            required
          />
        </div>
        <p id="register-password-hint" className="text-xs text-muted-foreground">
          {t("passwordHint")}
        </p>
        {showPasswordHints ? <PasswordHints password={password} /> : null}
        <FieldError id="register-password-error" message={fieldErrors.password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-confirm-password">{t("confirmPasswordLabel")}</Label>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="register-confirm-password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={t("confirmPasswordPlaceholder")}
            className="ps-9"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={
              fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined
            }
            required
          />
        </div>
        <FieldError id="register-confirm-password-error" message={fieldErrors.confirmPassword} />
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
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </form>
  );
}
