"use client";

import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FieldError } from "@/components/auth/field-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorKey } from "@/lib/auth-errors";
import { emailSchema } from "@/lib/validation/auth";

const CODE_PATTERN = /^\d{6}$/;

export function VerifyEmailForm({ initialEmail = "" }: { initialEmail?: string }) {
  const t = useTranslations("auth.verify");
  const tErrors = useTranslations("auth.errors");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [resendMessage, setResendMessage] = useState<string | undefined>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setResendMessage(undefined);
    setEmailError(undefined);
    setCodeError(undefined);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    let valid = true;

    if (!emailSchema.safeParse(normalizedEmail).success) {
      setEmailError(tErrors("invalidEmail"));
      valid = false;
    }

    if (!CODE_PATTERN.test(normalizedCode)) {
      setCodeError(tErrors("codeFormat"));
      valid = false;
    }

    if (!valid) return;

    setIsVerifying(true);

    const { error } = await authClient.emailOtp.verifyEmail({
      email: normalizedEmail,
      otp: normalizedCode,
    });

    setIsVerifying(false);

    if (error) {
      setFormError(authErrorKey(error));
      return;
    }

    setVerified(true);
    // The OTP endpoint creates the session; a full navigation makes sure the
    // new cookie is sent with the next server-rendered request.
    window.location.assign("/dashboard");
  }

  async function handleResend() {
    setFormError(undefined);
    setResendMessage(undefined);

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailSchema.safeParse(normalizedEmail).success) {
      setEmailError(tErrors("invalidEmail"));
      return;
    }

    setIsResending(true);

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: normalizedEmail,
      type: "email-verification",
    });

    setIsResending(false);

    if (error) {
      setFormError(authErrorKey(error));
      return;
    }

    // Deliberately generic: never reveal whether an account exists.
    setResendMessage(t("resendSuccess"));
  }

  if (verified) {
    return <Alert variant="success">{t("successBody")}</Alert>;
  }

  return (
    <form className="space-y-5" onSubmit={handleVerify} noValidate>
      {formError ? (
        <Alert variant="destructive">{tErrors(formError.replace("errors.", ""))}</Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="verify-email">{t("emailLabel")}</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="verify-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="ps-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "verify-email-error" : undefined}
            required
          />
        </div>
        <FieldError id="verify-email-error" message={emailError} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="verify-code">{t("codeLabel")}</Label>
        <Input
          id="verify-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder={t("codePlaceholder")}
          className="text-center text-lg font-semibold tracking-[0.5em]"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={Boolean(codeError)}
          aria-describedby={codeError ? "verify-code-error" : "verify-code-hint"}
          required
        />
        <p id="verify-code-hint" className="text-xs text-muted-foreground">
          {t("codeHint")}
        </p>
        <FieldError id="verify-code-error" message={codeError} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isVerifying}>
        {isVerifying ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        )}
        {isVerifying ? t("verifying") : t("verifySubmit")}
      </Button>

      <div className="space-y-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">{t("resendBody")}</p>

        {resendMessage ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {resendMessage}
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Mail aria-hidden="true" className="h-4 w-4" />
            )}
            {isResending ? t("resending") : t("resendCode")}
          </Button>
        )}
      </div>
    </form>
  );
}
