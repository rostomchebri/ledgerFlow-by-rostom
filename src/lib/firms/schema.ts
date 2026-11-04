import { z } from "zod";

/** FIRM-01 — workspace onboarding payload. */
export const createFirmSchema = z
  .object({
    name: z
      .string({ message: "Firm name is required." })
      .trim()
      .min(2, "Firm name must be at least 2 characters.")
      .max(120, "Firm name must be at most 120 characters."),
  })
  .strict();

export type CreateFirmInput = z.infer<typeof createFirmSchema>;

/** FIRM-03 — roles that can be handed out through an invitation. */
export const INVITABLE_ROLES = ["ADMIN", "ACCOUNTANT", "VIEWER"] as const;

export const inviteMemberSchema = z
  .object({
    email: z
      .string({ message: "Email is required." })
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(254, "Email must be at most 254 characters."),
    role: z.enum(INVITABLE_ROLES, { message: "Select a role." }).default("ACCOUNTANT"),
  })
  .strict();

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
