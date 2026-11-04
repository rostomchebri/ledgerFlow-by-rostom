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

let transporter: Transporter | null = null;

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

async function sendMail(input: MailInput): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    // Local development without SMTP: keep the flow usable and make the link
    // easy to copy from the terminal. Never do this in production.
    if (env.isDevelopment) {
      logger.info("email.preview", { to: input.to, subject: input.subject });
      console.info(`\n--- ${input.subject} ---\nTo: ${input.to}\n\n${input.text}\n---\n`);
    }
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
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
  verifyAction: string;
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
    verifySubject: "Activez votre compte LedgerFlow",
    verifyIntro:
      "Bienvenue sur LedgerFlow. Confirmez votre adresse e-mail pour activer votre compte.",
    verifyAction: "Activer mon compte",
    verifyIgnore: "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
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
    verifySubject: "Activate your LedgerFlow account",
    verifyIntro: "Welcome to LedgerFlow. Confirm your email address to activate your account.",
    verifyAction: "Activate my account",
    verifyIgnore: "If you did not request this, you can safely ignore this email.",
    resetSubject: "Reset your LedgerFlow password",
    resetIntro: "You asked to reset your password. This link expires in one hour.",
    resetAction: "Choose a new password",
    resetIgnore: "If you did not request this reset, you can safely ignore this email.",
    existingSubject: "Sign-up attempt with your address",
    existingIntro:
      "Someone tried to create a LedgerFlow account with your email address. If this was you, sign in instead. Otherwise, ignore this email.",
  },
  ar: {
    verifySubject: "تفعيل حساب LedgerFlow",
    verifyIntro: "مرحباً بك في LedgerFlow. أكّد بريدك الإلكتروني لتفعيل حسابك.",
    verifyAction: "تفعيل حسابي",
    verifyIgnore: "إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد.",
    resetSubject: "إعادة تعيين كلمة مرور LedgerFlow",
    resetIntro: "طلبت إعادة تعيين كلمة المرور. ينتهي صلاحية هذا الرابط بعد ساعة.",
    resetAction: "اختيار كلمة مرور جديدة",
    resetIgnore: "إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا البريد.",
    existingSubject: "محاولة إنشاء حساب ببريدك",
    existingIntro:
      "حاول شخص ما إنشاء حساب LedgerFlow ببريدك الإلكتروني. إذا كنت أنت، فسجّل الدخول بدلاً من ذلك. وإلا، تجاهل هذا البريد.",
  },
};

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

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  url: string;
}): Promise<void> {
  const locale = detectLocale(input.url);
  const copy = COPY[locale];

  await sendSafely(
    {
      to: input.to,
      subject: copy.verifySubject,
      text: `${copy.verifyIntro}\n\n${copy.verifyAction}: ${input.url}\n\n${copy.verifyIgnore}`,
      html: layout(
        locale === "ar" ? "rtl" : "ltr",
        copy.verifyIntro,
        copy.verifyAction,
        input.url,
        copy.verifyIgnore,
      ),
    },
    "email.verification_failed",
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
