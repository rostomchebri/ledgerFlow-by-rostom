import type { Client } from "@prisma/client";

import type { ClientInput } from "./schema";

/** String-only shape used by the create/edit form (no nulls, no enum unions). */
export type ClientFormValues = {
  type: ClientInput["type"];
  name: string;
  contactName: string;
  email: string;
  phone: string;
  taxId: string;
  commercialRegister: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string;
};

export const EMPTY_CLIENT_FORM_VALUES: ClientFormValues = {
  type: "COMPANY",
  name: "",
  contactName: "",
  email: "",
  phone: "",
  taxId: "",
  commercialRegister: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postalCode: "",
  country: "DZ",
  notes: "",
};

/** Converts a persisted client into editable form values. */
export function clientToFormValues(
  client: Pick<
    Client,
    | "type"
    | "name"
    | "contactName"
    | "email"
    | "phone"
    | "taxId"
    | "commercialRegister"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "postalCode"
    | "country"
    | "notes"
  >,
): ClientFormValues {
  return {
    type: client.type,
    name: client.name,
    contactName: client.contactName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    taxId: client.taxId ?? "",
    commercialRegister: client.commercialRegister ?? "",
    addressLine1: client.addressLine1 ?? "",
    addressLine2: client.addressLine2 ?? "",
    city: client.city ?? "",
    postalCode: client.postalCode ?? "",
    country: client.country || "DZ",
    notes: client.notes ?? "",
  };
}

/** Raw form values -> API payload. The shared Zod schema trims and nulls empties. */
export function formValuesToPayload(values: ClientFormValues): ClientInput {
  return { ...values };
}
