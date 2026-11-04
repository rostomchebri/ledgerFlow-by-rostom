"use client";

import { AlertCircle, ArrowRight, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorKey, isEmailNotVerified, isRateLimited } from "@/lib/auth-errors";
import { emailSchema } from "@/lib/validation/auth";

type Notice = "verified" | "reset" | "registered" | undefined;

export function LoginForm({ callbackUrl, notice }: { callbackUrl: string; notice?: Notice }) {
  const t = useTranslations("auth.login");
  const tErrors = useTranslations("auth.errors");
  const tCommon = useTranslations("auth.common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [isPending, setIsPending] = useState(false);

  const noticeMessage =
    notice === "verified"
      ? t("verifiedNotice")
      : notice === "reset"
        ? t("resetNotice")
        : notice === "registered"
          ? t("registeredNotice")
          : undefined;

  function validate() {
    const errors: typeof fieldErrors = {};

    if (!emailSchema.safeParse(email).success) errors.email = tErrors("invalidEmail");
    if (!password) errors.password = tErrors("required");

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setNeedsVerification(false);

    if (!validate()) return;

    setIsPending(true);

    const { error } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      rememberMe,
      callbackURL: "/verify-email?verified=1",
    });

    setIsPending(false);

    if (!error) {
      // Full navigation guarantees the new session cookie is sent to the
      // server-rendered dashboard on the next request.
      window.location.assign(callbackUrl);
      return;
    }

    if (isEmailNotVerified(error)) {
      setNeedsVerification(true);
      setFormError("errors.emailNotVerified");
      return;
    }

    setFormError(authErrorKey(error));
  }

  async function handleResend() {
    if (!emailSchema.safeParse(email).success) {
      setFieldErrors({ email: tErrors("invalidEmail") });
      return;
    }

    setResendState("sending");

    const { error } = await authClient.sendVerificationEmail({
      email: email.trim().toLowerCase(),
      callbackURL: "/verify-email?verified=1",
    });

    setResendState(error && isRateLimited(error) ? "idle" : "sent");

    if (error && isRateLimited(error)) {
      setFormError("errors.rateLimited");
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {noticeMessage ? <Alert variant="success">{noticeMessage}</Alert> : null}

      {formError ? (
        <Alert variant="destructive">
          <p>{tErrors(formError.replace("errors.", ""))}</p>

          {needsVerification ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs">{t("unverifiedBody")}</p>
              {resendState === "sent" ? (
                <p className="flex items-center gap-1.5 text-xs font-medium">
                  <MailCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  {t("resendSuccess")}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={resendState === "sending"}
                >
                  {resendState === "sending" ? (
                    <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {t("resendVerification")}
                </Button>
              )}
            </div>
          ) : null}
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="login-email">{t("emailLabel")}</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="ps-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            required
          />
        </div>
        <FieldError id="login-email-error" message={fieldErrors.email} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="login-password">{t("passwordLabel")}</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            className="ps-9"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            required
          />
        </div>
        <FieldError id="login-password-error" message={fieldErrors.password} />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="rememberMe"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
        {t("rememberMe")}
      </label>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        )}
        {isPending ? t("submitting") : t("submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("registerLink")}
        </Link>
      </p>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        {tCommon("secureNote")}
      </p>
    </form>
  );
}
