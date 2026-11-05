"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  transactionFormToPayload,
  type TransactionFormValues,
} from "@/lib/transactions/form";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  transactionInputSchema,
} from "@/lib/transactions/schema";

type ClientOption = { id: string; name: string };

type TransactionFormProps = {
  mode: "create" | "edit";
  transactionId?: string;
  initialValues: TransactionFormValues;
  clients: ClientOption[];
};

export function TransactionForm({
  mode,
  transactionId,
  initialValues,
  clients,
}: TransactionFormProps) {
  const t = useTranslations("transactions.form");
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setField<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = transactionInputSchema.safeParse(transactionFormToPayload(values));
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !fields[path]) fields[path] = issue.message;
      }
      setErrors(fields);
      setFormError(t("fixErrors"));
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        mode === "edit" && transactionId
          ? `/api/transactions/${transactionId}`
          : "/api/transactions",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        data?: { id?: string };
        error?: { message?: string; details?: { fields?: Record<string, string> } };
      } | null;

      if (!response.ok) {
        setErrors(body?.error?.details?.fields ?? {});
        setFormError(body?.error?.message ?? t("saveFailed"));
        return;
      }

      router.push("/transactions");
      router.refresh();
    } catch {
      setFormError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <p>{formError}</p>
        </Alert>
      ) : null}

      <section className="glass-card space-y-5 rounded-2xl p-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t("detailsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("detailsDescription")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="type">{t("type")}</Label>
            <Select
              id="type"
              value={values.type}
              onChange={(event) =>
                setField("type", event.target.value as TransactionFormValues["type"])
              }
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">{t("category")}</Label>
            <Select
              id="category"
              value={values.category}
              onChange={(event) => setField("category", event.target.value)}
            >
              {TRANSACTION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">
              {t("description")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={300}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">
              {t("amount")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={values.amount}
              onChange={(event) => setField("amount", event.target.value)}
              aria-invalid={Boolean(errors.amount)}
            />
            {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">{t("currency")}</Label>
            <Input
              id="currency"
              value={values.currency}
              onChange={(event) => setField("currency", event.target.value.toUpperCase())}
              maxLength={3}
            />
            {errors.currency ? (
              <p className="text-xs text-destructive">{errors.currency}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occurredAt">{t("date")}</Label>
            <Input
              id="occurredAt"
              type="date"
              value={values.occurredAt}
              onChange={(event) => setField("occurredAt", event.target.value)}
              aria-invalid={Boolean(errors.occurredAt)}
            />
            {errors.occurredAt ? (
              <p className="text-xs text-destructive">{errors.occurredAt}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">{t("status")}</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(event) =>
                setField("status", event.target.value as TransactionFormValues["status"])
              }
            >
              {TRANSACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientId">{t("client")}</Label>
            <Select
              id="clientId"
              value={values.clientId}
              onChange={(event) => setField("clientId", event.target.value)}
            >
              <option value="">{t("noClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">{t("reference")}</Label>
            <Input
              id="reference"
              value={values.reference}
              onChange={(event) => setField("reference", event.target.value)}
              maxLength={80}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/transactions" className={buttonVariants({ variant: "outline" })}>
          {t("cancel")}
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
