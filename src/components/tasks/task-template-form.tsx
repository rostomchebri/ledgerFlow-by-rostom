"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TASK_PRIORITIES, TASK_RECURRENCES, taskTemplateSchema } from "@/lib/tasks/schema";

export function TaskTemplateForm() {
  const t = useTranslations("tasks.templatesPage.form");
  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    title: "",
    description: "",
    priority: "MEDIUM",
    recurrence: "NONE",
    defaultDueOffsetDays: "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = taskTemplateSchema.safeParse({
      ...values,
      description: values.description || undefined,
      defaultDueOffsetDays: values.defaultDueOffsetDays || undefined,
    });
    if (!parsed.success) {
      setError(t("invalid"));
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/tasks/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }

      setValues({
        name: "",
        title: "",
        description: "",
        priority: "MEDIUM",
        recurrence: "NONE",
        defaultDueOffsetDays: "0",
      });
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="template-name">{t("name")}</Label>
          <Input
            id="template-name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-title">{t("title")}</Label>
          <Input
            id="template-title"
            value={values.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder={t("titlePlaceholder")}
            maxLength={200}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-description">{t("description")}</Label>
        <Textarea
          id="template-description"
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          rows={2}
          maxLength={4000}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="template-priority">{t("priority")}</Label>
          <Select
            id="template-priority"
            value={values.priority}
            onChange={(event) => set("priority", event.target.value)}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`priorities.${priority}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-recurrence">{t("recurrence")}</Label>
          <Select
            id="template-recurrence"
            value={values.recurrence}
            onChange={(event) => set("recurrence", event.target.value)}
          >
            {TASK_RECURRENCES.map((recurrence) => (
              <option key={recurrence} value={recurrence}>
                {t(`recurrences.${recurrence}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-offset">{t("offset")}</Label>
          <Input
            id="template-offset"
            type="number"
            min={0}
            max={365}
            value={values.defaultDueOffsetDays}
            onChange={(event) => set("defaultDueOffsetDays", event.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? t("saving") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
