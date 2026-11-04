import { z } from "zod";

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * A short deny-list of the passwords that appear at the top of every breach
 * corpus. It is deliberately small: length and character-class rules do the
 * heavy lifting, and the list is easy to extend without changing behaviour.
 */
const COMMON_PASSWORDS = new Set([
  "123456789012",
  "password1234",
  "passwordpassword",
  "qwerty123456",
  "letmein12345",
  "welcome12345",
  "admin1234567",
  "iloveyou1234",
  "changeme1234",
  "motdepasse12",
]);

export type PasswordIssue =
  "tooShort" | "tooLong" | "missingLetter" | "missingNumber" | "tooCommon";

export function getPasswordIssues(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) issues.push("tooShort");
  if (password.length > PASSWORD_MAX_LENGTH) issues.push("tooLong");
  if (!/[A-Za-z\u00C0-\u024F\u0600-\u06FF]/.test(password)) issues.push("missingLetter");
  if (!/[0-9]/.test(password)) issues.push("missingNumber");
  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push("tooCommon");

  return issues;
}

export function isStrongPassword(password: string): boolean {
  return getPasswordIssues(password).length === 0;
}

export const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(EMAIL_MAX_LENGTH)
  .email("Enter a valid email address.");

export const nameSchema = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, "Name must be at least 2 characters.")
  .max(NAME_MAX_LENGTH, "Name is too long.");

/**
 * Server-side password schema. Better Auth also enforces min/max length; this
 * adds the composition and deny-list checks through an auth hook.
 */
export const passwordSchema = z.string().superRefine((password, ctx) => {
  for (const issue of getPasswordIssues(password)) {
    ctx.addIssue({
      code: "custom",
      message:
        issue === "tooShort"
          ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
          : issue === "tooLong"
            ? `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`
            : issue === "missingLetter"
              ? "Password must contain at least one letter."
              : issue === "missingNumber"
                ? "Password must contain at least one number."
                : "Choose a less common password.",
    });
  }
});

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
