"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  invoiceFormToPayload,
  invoiceTotal,
  type InvoiceFormValues,
} from "@/lib/invoices/form";
import { invoiceInputSchema } from "@/lib/invoices/schema";

type ClientOption = { id: string; name: string };

type InvoiceFormProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  initialValues: InvoiceFormValues;
  clients: ClientOption[];
};

export function InvoiceForm({ mode, invoiceId, initialValues, clients }: InvoiceFormProps) {
  const t = useTranslations("invoices.form");
  const locale = useLocale();
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setField<K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function setLine(index: number, key: keyof InvoiceFormValues["lines"][number], value: string) {
    setValues((previous) => ({
      ...previous,
      lines: previous.lines.map((line, position) =>
        position === index ? { ...line, [key]: value } : line,
      ),
    }));
  }

  function addLine() {
    setValues((previous) => ({
      ...previous,
      lines: [...previous.lines, { description: "", quantity: "1", unitPrice: "0" }],
    }));
  }

  function removeLine(index: number) {
    setValues((previous) => ({
      ...previous,
      lines:
        previous.lines.length > 1
          ? previous.lines.filter((_, position) => position !== index)
          : previous.lines,
    }));
  }

  const total = invoiceTotal(values.lines);
  const totalLabel = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: values.currency.length === 3 ? values.currency : "DZD",
    maximumFractionDigits: 2,
  }).format(total);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = invoiceInputSchema.safeParse(invoiceFormToPayload(values));
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!fields[key]) fields[key] = issue.message;
      }
      setErrors(fields);
      setFormError(t("fixErrors"));
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        mode === "edit" && invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices",
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

      const id = body?.data?.id ?? invoiceId;
      router.push(id ? `/invoices/${id}` : "/invoices");
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
          <h2 className="text-base font-semibold">{t("headerTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("headerDescription")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">
              {t("client")} <span className="text-destructive">*</span>
            </Label>
            <Select
              id="clientId"
              value={values.clientId}
              onChange={(event) => setField("clientId", event.target.value)}
              aria-invalid={Boolean(errors.clientId)}
            >
              <option value="">{t("selectClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            {errors.clientId ? (
              <p className="text-xs text-destructive">{errors.clientId}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="number">
              {t("number")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="number"
              value={values.number}
              onChange={(event) => setField("number", event.target.value)}
              maxLength={40}
              aria-invalid={Boolean(errors.number)}
            />
            {errors.number ? <p className="text-xs text-destructive">{errors.number}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issueDate">{t("issueDate")}</Label>
            <Input
              id="issueDate"
              type="date"
              value={values.issueDate}
              onChange={(event) => setField("issueDate", event.target.value)}
            />
            {errors.issueDate ? (
              <p className="text-xs text-destructive">{errors.issueDate}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">{t("dueDate")}</Label>
            <Input
              id="dueDate"
              type="date"
              value={values.dueDate}
              onChange={(event) => setField("dueDate", event.target.value)}
            />
            {errors.dueDate ? <p className="text-xs text-destructive">{errors.dueDate}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">{t("currency")}</Label>
            <Input
              id="currency"
              value={values.currency}
              onChange={(event) => setField("currency", event.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
        </div>
      </section>

      <section className="glass-card space-y-4 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{t("linesTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("linesDescription")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t("addLine")}
          </Button>
        </div>

        {errors.lines ? <p className="text-xs text-destructive">{errors.lines}</p> : null}

        <ul className="space-y-3">
          {values.lines.map((line, index) => (
            <li
              key={index}
              className="glass-soft grid grid-cols-1 gap-3 rounded-xl p-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_2.5rem]"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`line-description-${index}`} className="text-xs">
                  {t("description")}
                </Label>
                <Input
                  id={`line-description-${index}`}
                  value={line.description}
                  onChange={(event) => setLine(index, "description", event.target.value)}
                  maxLength={300}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`line-quantity-${index}`} className="text-xs">
                  {t("quantity")}
                </Label>
                <Input
                  id={`line-quantity-${index}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.quantity}
                  onChange={(event) => setLine(index, "quantity", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`line-price-${index}`} className="text-xs">
                  {t("unitPrice")}
                </Label>
                <Input
                  id={`line-price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => setLine(index, "unitPrice", event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                  disabled={values.lines.length === 1}
                  title={t("removeLine")}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border)/0.55)] pt-4">
          <span className="text-sm text-muted-foreground">{t("total")}</span>
          <span className="text-xl font-bold tabular-nums">{totalLabel}</span>
        </div>
      </section>

      <section className="glass-card space-y-2 rounded-2xl p-6">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(event) => setField("notes", event.target.value)}
          rows={3}
          maxLength={2000}
        />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={mode === "edit" && invoiceId ? `/invoices/${invoiceId}` : "/invoices"}
          className={buttonVariants({ variant: "outline" })}
        >
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
