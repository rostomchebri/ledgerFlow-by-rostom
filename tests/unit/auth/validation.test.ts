import { describe, expect, it } from "vitest";

import {
  emailSchema,
  getPasswordIssues,
  isStrongPassword,
  nameSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

describe("password policy", () => {
  it("accepts a long password with a letter and a number", () => {
    expect(getPasswordIssues("correct horse 42")).toEqual([]);
    expect(isStrongPassword("correct horse 42")).toBe(true);
  });

  it("requires the minimum length", () => {
    expect(getPasswordIssues("short1")).toContain("tooShort");
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });

  it("rejects passwords above the maximum length", () => {
    expect(getPasswordIssues(`a1${"x".repeat(PASSWORD_MAX_LENGTH)}`)).toContain("tooLong");
  });

  it("requires at least one letter", () => {
    expect(getPasswordIssues("1234567890123")).toContain("missingLetter");
  });

  it("requires at least one number", () => {
    expect(getPasswordIssues("abcdefghijkl")).toContain("missingNumber");
  });

  it("rejects common passwords", () => {
    expect(getPasswordIssues("123456789012")).toEqual(
      expect.arrayContaining(["missingLetter", "tooCommon"]),
    );
  });
});

describe("email and name schemas", () => {
  it("trims and accepts a valid email address", () => {
    expect(emailSchema.parse("  User@Example.com  ")).toBe("User@Example.com");
  });

  it("rejects invalid email addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("requires a reasonably sized name", () => {
    expect(nameSchema.parse("  Amine Bensalem ")).toBe("Amine Bensalem");
    expect(nameSchema.safeParse("A").success).toBe(false);
    expect(nameSchema.safeParse("").success).toBe(false);
  });
});

describe("form schemas", () => {
  it("accepts matching sign-up passwords", () => {
    const result = signUpSchema.safeParse({
      name: "Amine Bensalem",
      email: "amine@example.com",
      password: "correct horse 42",
      confirmPassword: "correct horse 42",
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched sign-up passwords", () => {
    const result = signUpSchema.safeParse({
      name: "Amine Bensalem",
      email: "amine@example.com",
      password: "correct horse 42",
      confirmPassword: "correct horse 43",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched reset passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "correct horse 42",
      confirmPassword: "different horse 42",
    });

    expect(result.success).toBe(false);
  });

  it("requires a password when signing in", () => {
    expect(signInSchema.safeParse({ email: "amine@example.com", password: "" }).success).toBe(
      false,
    );
  });
});
