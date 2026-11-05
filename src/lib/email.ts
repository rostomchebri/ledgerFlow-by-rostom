import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailProvider = "resend" | "smtp" | "preview";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Shared by the OTP plugin configuration and the e-mail copy. */
export const VERIFICATION_CODE_EXPIRES_IN_MINUTES = 10;

let transporter: Transporter | null = null;

/**
 * Resend is preferred when an API key is configured; otherwise the SMTP relay
 * is used. Running without either is only supported in development, where the
 * message is printed to the terminal (Mailpit or a real relay is required for
 * an actual inbox).
 */
export function resolveMailProvider(): MailProvider {
  if (env.EMAIL_PROVIDER === "resend") {
    return env.RESEND_API_KEY ? "resend" : "preview";
  }

  if (env.EMAIL_PROVIDER === "smtp") {
    return env.SMTP_HOST ? "smtp" : "preview";
  }

  if (env.RESEND_API_KEY) return "resend";
  if (env.SMTP_HOST) return "smtp";

  return "preview";
}

function mailFrom(): string {
  return env.EMAIL_FROM ?? env.SMTP_FROM ?? "LedgerFlow <no-reply@ledgerflow.local>";
}

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;

  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });

  return transporter;
}

async function sendWithResend(input: MailInput): Promise<void> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (response.ok) return;

  const detail = await response.text().catch(() => "");
  throw new Error(
    `Resend responded with ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`,
  );
}

async function sendMail(input: MailInput): Promise<void> {
  const provider = resolveMailProvider();

  if (provider === "resend") {
    await sendWithResend(input);
    return;
  }

  if (provider === "smtp") {
    const transport = getTransporter();

    if (!transport) {
      throw new Error("SMTP is selected but SMTP_HOST is not configured.");
    }

    await transport.sendMail({
      from: mailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return;
  }

  if (env.isDevelopment) {
    // Keep the flow usable on a fresh checkout: the code is printed locally.
    // Never do this in production.
    logger.info("email.preview", { to: input.to, subject: input.subject });
    console.info(`\n--- ${input.subject} ---\nTo: ${input.to}\n\n${input.text}\n---\n`);
    return;
  }

  throw new Error("No email provider configured: set RESEND_API_KEY or SMTP_HOST.");
}

async function sendSafely(input: MailInput, event: string): Promise<void> {
  try {
    await sendMail(input);
  } catch (error) {
    // Never fail the auth flow because the mail server is unavailable. The
    // user can request another link, and the failure is visible in the logs.
    logger.error(event, {
      to: input.to,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function detectLocale(url: string): "fr" | "ar" | "en" {
  const match = /\/callbackURL=([^&]*)/.exec(url)?.[1];

  if (!match) return "fr";

  const decoded = decodeURIComponent(match);
  if (decoded.startsWith("/ar") || decoded.includes("/ar/")) return "ar";
  if (decoded.startsWith("/en") || decoded.includes("/en/")) return "en";

  return "fr";
}

type Copy = {
  verifySubject: string;
  verifyIntro: string;
  verifyExpires: string;
  verifyIgnore: string;
  resetSubject: string;
  resetIntro: string;
  resetAction: string;
  resetIgnore: string;
  existingSubject: string;
  existingIntro: string;
};

const COPY: Record<"fr" | "ar" | "en", Copy> = {
  fr: {
    verifySubject: "Votre code de vérification LedgerFlow",
    verifyIntro:
      "Bienvenue sur LedgerFlow. Saisissez ce code pour vérifier votre adresse e-mail et activer votre compte :",
    verifyExpires: "Ce code expire dans {minutes} minutes.",
    verifyIgnore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail et ne partagez jamais ce code.",
    resetSubject: "Réinitialisez votre mot de passe LedgerFlow",
    resetIntro:
      "Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire dans une heure.",
    resetAction: "Choisir un nouveau mot de passe",
    resetIgnore: "Si vous n’avez pas demandé cette réinitialisation, ignorez cet e-mail.",
    existingSubject: "Tentative d’inscription avec votre adresse",
    existingIntro:
      "Quelqu’un a tenté de créer un compte LedgerFlow avec votre adresse e-mail. Si c’était vous, connectez-vous plutôt. Sinon, ignorez cet e-mail.",
  },
  en: {
    verifySubject: "Your LedgerFlow verification code",
    verifyIntro:
      "Welcome to LedgerFlow. Enter this code to verify your email address and activate your account:",
    verifyExpires: "This code expires in {minutes} minutes.",
    verifyIgnore:
      "If you did not request this, ignore this email and never share this code with anyone.",
    resetSubject: "Reset your LedgerFlow password",
    resetIntro: "You asked to reset your password. This link expires in one hour.",
    resetAction: "Choose a new password",
    resetIgnore: "If you did not request this reset, you can safely ignore this email.",
    existingSubject: "Sign-up attempt with your address",
    existingIntro:
      "Someone tried to create a LedgerFlow account with your email address. If this was you, sign in instead. Otherwise, ignore this email.",
  },
  ar: {
    verifySubject: "رمز التحقق الخاص بـ LedgerFlow",
    verifyIntro:
      "مرحباً بك في LedgerFlow. أدخل هذا الرمز للتحقق من بريدك الإلكتروني وتفعيل حسابك:",
    verifyExpires: "تنتهي صلاحية هذا الرمز خلال {minutes} دقائق.",
    verifyIgnore: "إذا لم تطلب ذلك، تجاهل هذا البريد ولا تشارك هذا الرمز مع أي شخص.",
    resetSubject: "إعادة تعيين كلمة مرور LedgerFlow",
    resetIntro: "طلبت إعادة تعيين كلمة المرور. ينتهي صلاحية هذا الرابط بعد ساعة.",
    resetAction: "اختيار كلمة مرور جديدة",
    resetIgnore: "إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا البريد.",
    existingSubject: "محاولة إنشاء حساب ببريدك",
    existingIntro:
      "حاول شخص ما إنشاء حساب LedgerFlow ببريدك الإلكتروني. إذا كنت أنت، فسجّل الدخول بدلاً من ذلك. وإلا، تجاهل هذا البريد.",
  },
};

type Locale = "fr" | "ar" | "en";

/** Pick the message language from an Accept-Language header. */
export function detectLocaleFromAcceptLanguage(value?: string | null): Locale {
  if (!value) return "fr";

  const primary = value.split(",")[0]?.trim().toLowerCase() ?? "";

  if (primary.startsWith("ar")) return "ar";
  if (primary.startsWith("en")) return "en";

  return "fr";
}

function layout(
  direction: "ltr" | "rtl",
  intro: string,
  action: string,
  url: string,
  ignore: string,
) {
  return `
    <div dir="${direction}" style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:20px;font-weight:700;margin:0 0 16px">LedgerFlow</p>
      <p style="margin:0 0 20px">${escapeHtml(intro)}</p>
      <p style="margin:0 0 24px">
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">${escapeHtml(action)}</a>
      </p>
      <p style="margin:0 0 20px;font-size:12px;color:#64748b;word-break:break-all">${escapeHtml(url)}</p>
      <p style="margin:0;font-size:12px;color:#64748b">${escapeHtml(ignore)}</p>
    </div>
  `;
}

function codeLayout(
  direction: "ltr" | "rtl",
  intro: string,
  code: string,
  expires: string,
  ignore: string,
) {
  return `
    <div dir="${direction}" style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:20px;font-weight:700;margin:0 0 16px">LedgerFlow</p>
      <p style="margin:0 0 20px">${escapeHtml(intro)}</p>
      <p style="margin:0 0 20px">
        <span style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:14px 22px;font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a">${escapeHtml(code)}</span>
      </p>
      <p style="margin:0 0 20px;font-size:12px;color:#64748b">${escapeHtml(expires)}</p>
      <p style="margin:0;font-size:12px;color:#64748b">${escapeHtml(ignore)}</p>
    </div>
  `;
}

export async function sendVerificationCodeEmail(input: {
  to: string;
  code: string;
  acceptLanguage?: string | null;
}): Promise<void> {
  const locale = detectLocaleFromAcceptLanguage(input.acceptLanguage);
  const copy = COPY[locale];
  const expires = copy.verifyExpires.replace(
    "{minutes}",
    String(VERIFICATION_CODE_EXPIRES_IN_MINUTES),
  );

  await sendSafely(
    {
      to: input.to,
      subject: copy.verifySubject,
      text: `${copy.verifyIntro}\n\n${input.code}\n\n${expires}\n\n${copy.verifyIgnore}`,
      html: codeLayout(
        locale === "ar" ? "rtl" : "ltr",
        copy.verifyIntro,
        input.code,
        expires,
        copy.verifyIgnore,
      ),
    },
    "email.verification_code_failed",
  );
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  const locale = detectLocale(input.url);
  const copy = COPY[locale];

  await sendSafely(
    {
      to: input.to,
      subject: copy.resetSubject,
      text: `${copy.resetIntro}\n\n${copy.resetAction}: ${input.url}\n\n${copy.resetIgnore}`,
      html: layout(
        locale === "ar" ? "rtl" : "ltr",
        copy.resetIntro,
        copy.resetAction,
        input.url,
        copy.resetIgnore,
      ),
    },
    "email.password_reset_failed",
  );
}

export async function sendExistingUserSignUpEmail(input: {
  to: string;
  name: string;
}): Promise<void> {
  const locale = "fr" as const;
  const copy = COPY[locale];

  await sendSafely(
    {
      to: input.to,
      subject: copy.existingSubject,
      text: `${copy.existingIntro}`,
      html: layout(
        "ltr",
        copy.existingIntro,
        "LedgerFlow",
        env.NEXT_PUBLIC_APP_URL,
        copy.existingIntro,
      ),
    },
    "email.existing_user_notice_failed",
  );
}

// ---------------------------------------------------------------------------
// NOTIF-03 — due and overdue task reminders
// ---------------------------------------------------------------------------

export async function sendTaskReminderEmail(input: {
  to: string;
  name: string;
  taskTitle: string;
  firmName: string;
  clientName?: string | null;
  dueDate: Date;
  overdue: boolean;
  url: string;
}): Promise<void> {
  const dueLabel = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(input.dueDate);

  const subject = input.overdue
    ? `Overdue task: ${input.taskTitle}`
    : `Task due today: ${input.taskTitle}`;

  const intro = input.overdue
    ? `The task “${input.taskTitle}” for ${input.firmName} was due on ${dueLabel} and is still open.`
    : `The task “${input.taskTitle}” for ${input.firmName} is due today (${dueLabel}).`;

  const context = input.clientName ? `Client: ${input.clientName}` : "No client attached.";
  const action = "Open the task";
  const ignore = "You receive this reminder because this task is assigned to you.";

  await sendSafely(
    {
      to: input.to,
      subject,
      text: `Hello ${input.name},\n\n${intro}\n${context}\n\n${action}: ${input.url}\n\n${ignore}`,
      html: layout("ltr", `${intro} ${context}`, action, input.url, ignore),
    },
    "email.task_reminder_failed",
  );
}

// ---------------------------------------------------------------------------
// FIRM-03 — team invitations
// ---------------------------------------------------------------------------

const INVITATION_ROLE_LABELS: Record<"fr" | "ar" | "en", Record<string, string>> = {
  fr: {
    OWNER: "propriétaire",
    ADMIN: "administrateur",
    ACCOUNTANT: "comptable",
    VIEWER: "lecteur",
  },
  en: { OWNER: "owner", ADMIN: "administrator", ACCOUNTANT: "accountant", VIEWER: "viewer" },
  ar: { OWNER: "مالك", ADMIN: "مدير", ACCOUNTANT: "محاسب", VIEWER: "قارئ" },
};

export async function sendInvitationEmail(input: {
  to: string;
  firmName: string;
  inviterName: string;
  role: string;
  url: string;
}): Promise<void> {
  const locale = "fr" as const;
  const roleLabel = INVITATION_ROLE_LABELS[locale][input.role] ?? input.role;

  const intro = `${input.inviterName} vous invite à rejoindre l’espace de travail « ${input.firmName} » sur LedgerFlow en tant que ${roleLabel}.`;
  const action = "Rejoindre l’espace de travail";
  const ignore = "Si vous ne connaissez pas cette personne, ignorez cet e-mail.";

  await sendSafely(
    {
      to: input.to,
      subject: `Invitation à rejoindre ${input.firmName} sur LedgerFlow`,
      text: `${intro}\n\n${action}: ${input.url}\n\n${ignore}`,
      html: layout("ltr", intro, action, input.url, ignore),
    },
    "email.invitation_failed",
  );
}
