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
import { Textarea } from "@/components/ui/textarea";
import { taskFormToPayload, type TaskFormValues } from "@/lib/tasks/form";
import {
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  TASK_STATUSES,
  taskInputSchema,
} from "@/lib/tasks/schema";

type Option = { id: string; name: string; email?: string };

type TaskFormProps = {
  mode: "create" | "edit";
  taskId?: string;
  initialValues: TaskFormValues;
  clients: Option[];
  members: Option[];
};

export function TaskForm({ mode, taskId, initialValues, clients, members }: TaskFormProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setField<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = taskInputSchema.safeParse(taskFormToPayload(values));
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !fields[path]) fields[path] = issue.message;
      }
      setErrors(fields);
      setFormError(t("form.fixErrors"));
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        mode === "edit" && taskId ? `/api/tasks/${taskId}` : "/api/tasks",
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
        setFormError(body?.error?.message ?? t("form.saveFailed"));
        return;
      }

      const id = body?.data?.id ?? taskId;
      router.push(id ? `/tasks/${id}` : "/tasks");
      router.refresh();
    } catch {
      setFormError(t("form.networkError"));
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

      <section className="glass-card space-y-5 rounded-2xl p-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t("form.detailsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("form.detailsDescription")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">
            {t("form.titleLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => setField("title", event.target.value)}
            placeholder={t("form.titlePlaceholder")}
            maxLength={200}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t("form.descriptionLabel")}</Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            placeholder={t("form.descriptionPlaceholder")}
            rows={4}
            maxLength={4000}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">{t("form.clientLabel")}</Label>
            <Select
              id="clientId"
              value={values.clientId}
              onChange={(event) => setField("clientId", event.target.value)}
            >
              <option value="">{t("form.noClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assigneeId">{t("form.assigneeLabel")}</Label>
            <Select
              id="assigneeId"
              value={values.assigneeId}
              onChange={(event) => setField("assigneeId", event.target.value)}
            >
              <option value="">{t("form.unassigned")}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">{t("form.statusLabel")}</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(event) =>
                setField("status", event.target.value as TaskFormValues["status"])
              }
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority">{t("form.priorityLabel")}</Label>
            <Select
              id="priority"
              value={values.priority}
              onChange={(event) =>
                setField("priority", event.target.value as TaskFormValues["priority"])
              }
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priorities.${priority}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">{t("form.dueDateLabel")}</Label>
            <Input
              id="dueDate"
              type="date"
              value={values.dueDate}
              onChange={(event) => setField("dueDate", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recurrence">{t("form.recurrenceLabel")}</Label>
            <Select
              id="recurrence"
              value={values.recurrence}
              onChange={(event) =>
                setField("recurrence", event.target.value as TaskFormValues["recurrence"])
              }
            >
              {TASK_RECURRENCES.map((recurrence) => (
                <option key={recurrence} value={recurrence}>
                  {t(`recurrences.${recurrence}`)}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{t("form.recurrenceHint")}</p>
          </div>
        </div>

        {mode === "create" ? (
          <div className="space-y-1.5">
            <Label htmlFor="checklist">{t("form.checklistLabel")}</Label>
            <Textarea
              id="checklist"
              value={values.checklist}
              onChange={(event) => setField("checklist", event.target.value)}
              placeholder={t("form.checklistPlaceholder")}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{t("form.checklistHint")}</p>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={mode === "edit" && taskId ? `/tasks/${taskId}` : "/tasks"}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("form.cancel")}
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? t("form.saving") : t("form.save")}
        </Button>
      </div>
    </form>
  );
}
