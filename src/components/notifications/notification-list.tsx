"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck, FileText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  type: "TASK_DUE" | "TASK_OVERDUE" | "INVOICE_OVERDUE" | "INVITATION" | "SYSTEM";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationList({ initialItems }: { initialItems: NotificationItem[] }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState(false);

  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  async function markAll() {
    setPending(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setItems((previous) =>
        previous.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
    }
    if (item.href) router.push(item.href);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void markAll()} disabled={pending}>
          <CheckCheck aria-hidden="true" className="h-4 w-4" />
          {t("markAll")}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="glass-soft rounded-2xl border-dashed px-6 py-14 text-center">
          <Bell aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="glass-card divide-y divide-[hsl(var(--border)/0.5)] overflow-hidden rounded-2xl">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openItem(item)}
                className="flex w-full gap-4 px-5 py-4 text-start transition-colors hover:bg-[hsl(var(--card)/0.5)]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  {item.type === "INVOICE_OVERDUE" ? (
                    <FileText aria-hidden="true" className="h-4 w-4" />
                  ) : item.type === "TASK_DUE" || item.type === "TASK_OVERDUE" ? (
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Bell aria-hidden="true" className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    {!item.readAt ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {t("new")}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.body}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">
                    {formatter.format(new Date(item.createdAt))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
