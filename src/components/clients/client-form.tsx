"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formValuesToPayload, type ClientFormValues } from "@/lib/clients/form";
import { CLIENT_TYPES, clientInputSchema, fieldErrorsFromZod } from "@/lib/clients/schema";
import { clientDetailRoute } from "@/lib/client-routes";
import { cn } from "@/lib/utils";

type ClientFormProps = {
  mode: "create" | "edit";
  clientId?: string;
  initialValues: ClientFormValues;
};

type SaveResponse = {
  data?: { id?: string };
  error?: { message?: string; details?: { fields?: Record<string, string> } };
};

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ClientForm({ mode, clientId, initialValues }: ClientFormProps) {
  const router = useRouter();
  const t = useTranslations("clients.form");
  const tTypes = useTranslations("clients.types");
  const [values, setValues] = useState<ClientFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cancelHref = mode === "edit" && clientId ? clientDetailRoute(clientId) : "/clients";

  function setField<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function describedBy(key: keyof ClientFormValues): string | undefined {
    return errors[key] ? `${key}-error` : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = clientInputSchema.safeParse(formValuesToPayload(values));
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error));
      setFormError(t("fixErrors"));
      return;
    }

    setPending(true);
    try {
      const endpoint = mode === "edit" && clientId ? `/api/clients/${clientId}` : "/api/clients";
      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const body = (await response.json().catch(() => null)) as SaveResponse | null;

      if (!response.ok) {
        setErrors(body?.error?.details?.fields ?? {});
        setFormError(body?.error?.message ?? t("saveFailed"));
        return;
      }

      const savedId = body?.data?.id;
      if (!savedId) {
        setFormError(t("missingId"));
        return;
      }

      router.push(clientDetailRoute(savedId));
      router.refresh();
    } catch {
      setFormError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-semibold">{t("identityTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("identityDescription")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("typeLabel")} htmlFor="type" required error={errors.type}>
            <Select
              id="type"
              name="type"
              value={values.type}
              aria-invalid={Boolean(errors.type)}
              aria-describedby={describedBy("type")}
              onChange={(event) => setField("type", event.target.value as ClientFormValues["type"])}
            >
              {CLIENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {tTypes(type)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t("nameLabel")}
            htmlFor="name"
            required
            hint={t("nameHint")}
            error={errors.name}
          >
            <Input
              id="name"
              name="name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={160}
              autoComplete="organization"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name")}
            />
          </Field>

          <Field
            label={t("contactNameLabel")}
            htmlFor="contactName"
            hint={t("contactNameHint")}
            error={errors.contactName}
            className="sm:col-span-2"
          >
            <Input
              id="contactName"
              name="contactName"
              value={values.contactName}
              onChange={(event) => setField("contactName", event.target.value)}
              placeholder={t("contactNamePlaceholder")}
              maxLength={120}
              autoComplete="name"
              aria-invalid={Boolean(errors.contactName)}
              aria-describedby={describedBy("contactName")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-semibold">{t("contactTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("contactDescription")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("emailLabel")} htmlFor="email" error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder={t("emailPlaceholder")}
              maxLength={254}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email")}
            />
          </Field>

          <Field label={t("phoneLabel")} htmlFor="phone" error={errors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder={t("phonePlaceholder")}
              maxLength={40}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy("phone")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-semibold">{t("legalTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("legalDescription")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("taxIdLabel")} htmlFor="taxId" hint={t("taxIdHint")} error={errors.taxId}>
            <Input
              id="taxId"
              name="taxId"
              value={values.taxId}
              onChange={(event) => setField("taxId", event.target.value)}
              maxLength={40}
              aria-invalid={Boolean(errors.taxId)}
              aria-describedby={describedBy("taxId")}
            />
          </Field>

          <Field
            label={t("commercialRegisterLabel")}
            htmlFor="commercialRegister"
            hint={t("commercialRegisterHint")}
            error={errors.commercialRegister}
          >
            <Input
              id="commercialRegister"
              name="commercialRegister"
              value={values.commercialRegister}
              onChange={(event) => setField("commercialRegister", event.target.value)}
              maxLength={40}
              aria-invalid={Boolean(errors.commercialRegister)}
              aria-describedby={describedBy("commercialRegister")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-semibold">{t("addressTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("addressDescription")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t("addressLine1Label")}
            htmlFor="addressLine1"
            error={errors.addressLine1}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine1"
              name="addressLine1"
              value={values.addressLine1}
              onChange={(event) => setField("addressLine1", event.target.value)}
              placeholder={t("addressLine1Placeholder")}
              maxLength={160}
              autoComplete="address-line1"
              aria-invalid={Boolean(errors.addressLine1)}
              aria-describedby={describedBy("addressLine1")}
            />
          </Field>

          <Field
            label={t("addressLine2Label")}
            htmlFor="addressLine2"
            hint={t("optional")}
            error={errors.addressLine2}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine2"
              name="addressLine2"
              value={values.addressLine2}
              onChange={(event) => setField("addressLine2", event.target.value)}
              maxLength={160}
              autoComplete="address-line2"
              aria-invalid={Boolean(errors.addressLine2)}
              aria-describedby={describedBy("addressLine2")}
            />
          </Field>

          <Field label={t("cityLabel")} htmlFor="city" error={errors.city}>
            <Input
              id="city"
              name="city"
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
              maxLength={80}
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.city)}
              aria-describedby={describedBy("city")}
            />
          </Field>

          <Field label={t("postalCodeLabel")} htmlFor="postalCode" error={errors.postalCode}>
            <Input
              id="postalCode"
              name="postalCode"
              value={values.postalCode}
              onChange={(event) => setField("postalCode", event.target.value)}
              maxLength={20}
              autoComplete="postal-code"
              aria-invalid={Boolean(errors.postalCode)}
              aria-describedby={describedBy("postalCode")}
            />
          </Field>

          <Field
            label={t("countryLabel")}
            htmlFor="country"
            hint={t("countryHint")}
            error={errors.country}
          >
            <Input
              id="country"
              name="country"
              value={values.country}
              onChange={(event) => setField("country", event.target.value.toUpperCase())}
              placeholder={t("countryPlaceholder")}
              maxLength={2}
              autoComplete="country"
              aria-invalid={Boolean(errors.country)}
              aria-describedby={describedBy("country")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-semibold">{t("notesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("notesDescription")}</p>
        </div>

        <Field label={t("notesLabel")} htmlFor="notes" error={errors.notes}>
          <Textarea
            id="notes"
            name="notes"
            value={values.notes}
            onChange={(event) => setField("notes", event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder={t("notesPlaceholder")}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={describedBy("notes")}
          />
        </Field>
        <p className="mt-2 text-end text-xs text-muted-foreground">
          {t("counter", { count: values.notes.length })}
        </p>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          {t("cancel")}
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? t("saving") : mode === "edit" ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
