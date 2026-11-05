"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

import { Select } from "@/components/ui/select";
import { TASK_STATUSES } from "@/lib/tasks/schema";

type Status = (typeof TASK_STATUSES)[number];

/** TASK-02 — inline status change used by the list and board views. */
export function TaskStatusSelect({
  taskId,
  status,
  className,
}: {
  taskId: string;
  status: Status;
  className?: string;
}) {
  const t = useTranslations("tasks.statuses");
  const router = useRouter();
  const [value, setValue] = useState<Status>(status);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function change(next: Status) {
    setValue(next);
    setPending(true);
    setSaved(false);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        setValue(status);
        return;
      }
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 1500);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Select
        value={value}
        disabled={pending}
        onChange={(event) => void change(event.target.value as Status)}
        aria-label={t("label")}
        className={className}
      >
        {TASK_STATUSES.map((option) => (
          <option key={option} value={option}>
            {t(option)}
          </option>
        ))}
      </Select>
      {pending ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
      {saved ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-500" /> : null}
    </span>
  );
}
