"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

/** TASK-04 — lightweight checklist with optimistic toggling. */
export function TaskChecklist({
  taskId,
  initialItems,
}: {
  taskId: string;
  initialItems: ChecklistItem[];
}) {
  const t = useTranslations("tasks.checklist");
  const [items, setItems] = useState(initialItems);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: ChecklistItem;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.data) {
        setError(payload?.error?.message ?? t("failed"));
        return;
      }
      setItems((previous) => [...previous, payload.data!]);
      setLabel("");
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function toggle(item: ChecklistItem) {
    const next = !item.done;
    setItems((previous) =>
      previous.map((entry) => (entry.id === item.id ? { ...entry, done: next } : entry)),
    );

    const response = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, done: next }),
    });

    if (!response.ok) {
      setItems((previous) =>
        previous.map((entry) => (entry.id === item.id ? { ...entry, done: item.done } : entry)),
      );
    }
  }

  const doneCount = items.filter((item) => item.done).length;

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("progress", { done: doneCount, total: items.length })}
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => void toggle(item)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm transition-colors hover:bg-[hsl(var(--card)/0.5)]"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  item.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-[hsl(var(--border))]",
                )}
              >
                {item.done ? <Check aria-hidden="true" className="h-3 w-3" /> : null}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  item.done && "text-muted-foreground line-through",
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addItem} className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t("placeholder")}
          maxLength={200}
          aria-label={t("placeholder")}
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !label.trim()}>
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="h-4 w-4" />
          )}
          {t("add")}
        </Button>
      </form>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
