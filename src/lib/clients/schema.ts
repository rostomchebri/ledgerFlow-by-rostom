import { z } from "zod";

export const CLIENT_TYPES = ["INDIVIDUAL", "COMPANY"] as const;
export const CLIENT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const CLIENT_TYPE_LABELS: Record<(typeof CLIENT_TYPES)[number], string> = {
  INDIVIDUAL: "Individual",
  COMPANY: "Company",
};
export const CLIENT_STATUS_LABELS: Record<(typeof CLIENT_STATUSES)[number], string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

/** Empty form fields arrive as `""`; persist them as NULL. */
function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function optionalText(max: number, label: string) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(max, `${label} must be at most ${max} characters.`)
      .optional(),
  );
}

function optionalEmail() {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(254, "Email must be at most 254 characters.")
      .email("Enter a valid email address.")
      .optional(),
  );
}

/**
 * Shared client payload schema (API + forms).
 * Legal/tax fields are optional free-form strings: no tax rule is enforced here.
 */
export const clientInputSchema = z
  .object({
    type: z.enum(CLIENT_TYPES, { message: "Select a client type." }).default("COMPANY"),
    name: z
      .string({ message: "Name is required." })
      .trim()
      .min(1, "Name is required.")
      .max(160, "Name must be at most 160 characters."),
    contactName: optionalText(120, "Contact name"),
    email: optionalEmail(),
    phone: optionalText(40, "Phone"),
    taxId: optionalText(40, "Tax identification number"),
    commercialRegister: optionalText(40, "Commercial register"),
    addressLine1: optionalText(160, "Address line 1"),
    addressLine2: optionalText(160, "Address line 2"),
    city: optionalText(80, "City"),
    postalCode: optionalText(20, "Postal code"),
    country: z.preprocess(
      (value) => {
        if (typeof value !== "string" || value.trim() === "") return "DZ";
        return value.trim().toUpperCase();
      },
      z
        .string()
        .regex(/^[A-Z]{2}$/, "Use a two-letter country code (e.g. DZ).")
        .default("DZ"),
    ),
    notes: optionalText(2000, "Notes"),
  })
  .strict();

export type ClientInput = z.infer<typeof clientInputSchema>;

/** PATCH accepts any subset of the create payload, but at least one field. */
export const clientUpdateSchema = clientInputSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

export const CLIENT_SORT_OPTIONS = [
  "name-asc",
  "name-desc",
  "created-desc",
  "created-asc",
  "updated-desc",
] as const;

export const CLIENT_STATUS_FILTERS = ["active", "archived", "all"] as const;
export const CLIENT_TYPE_FILTERS = ["all", "individual", "company"] as const;
export const CLIENT_PAGE_SIZES = [10, 20, 50] as const;

const pageSizeSchema = z.union([z.literal(10), z.literal(20), z.literal(50)]);

/**
 * Validates list query parameters coming from the URL or the API.
 * Invalid values fall back to safe defaults instead of throwing (bookmarkable URLs).
 */
export const clientListQuerySchema = z.object({
  q: z.string().trim().max(120, "Search is too long.").catch("").default(""),
  status: z.enum(CLIENT_STATUS_FILTERS).catch("active").default("active"),
  type: z.enum(CLIENT_TYPE_FILTERS).catch("all").default("all"),
  sort: z.enum(CLIENT_SORT_OPTIONS).catch("name-asc").default("name-asc"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: pageSizeSchema.catch(20).default(20),
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

type RawQueryValue = string | string[] | undefined;

function firstValue(value: RawQueryValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Normalises Next.js `searchParams` (which may contain arrays) before parsing. */
export function parseClientListQuery(
  raw: Record<string, RawQueryValue> | URLSearchParams,
): ClientListQuery {
  const get = (key: string) =>
    raw instanceof URLSearchParams ? (raw.get(key) ?? undefined) : firstValue(raw[key]);

  return clientListQuerySchema.parse({
    q: get("q") ?? undefined,
    status: get("status") ?? undefined,
    type: get("type") ?? undefined,
    sort: get("sort") ?? undefined,
    page: get("page") ?? undefined,
    pageSize: get("pageSize") ?? undefined,
  });
}

/** Maps Zod issues to `{ field: message }` for form rendering. */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
