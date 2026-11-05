"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck, FileText, RefreshCw, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "TASK_DUE" | "TASK_OVERDUE" | "INVOICE_OVERDUE" | "INVITATION" | "SYSTEM";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function iconFor(type: NotificationItem["type"]) {
  if (type === "INVOICE_OVERDUE") return <FileText aria-hidden="true" className="h-4 w-4" />;
  if (type === "TASK_DUE" || type === "TASK_OVERDUE")
    return <Sparkles aria-hidden="true" className="h-4 w-4" />;
  return <Bell aria-hidden="true" className="h-4 w-4" />;
}

function relativeTime(value: string, locale: string): string {
  const diff = new Date(value).getTime() - Date.now();
  const minutes = Math.round(diff / 60_000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

/**
 * NOTIF-01 — live notification bell. The list is loaded from the tenant-scoped
 * API; the unread badge is derived from the same response.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as {
        data?: { items: NotificationItem[]; unread: number };
      };
      setItems(body.data?.items ?? []);
      setUnread(body.data?.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((previous) =>
      previous.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    setUnread(0);
    router.refresh();
  }

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
    }

    setOpen(false);
    if (item.href) router.push(item.href);
    else router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        aria-label={t("open")}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "glass-icon-button relative h-10 w-10",
          open && "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.55)] text-foreground",
        )}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute end-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary ring-2 ring-[hsl(var(--card)/0.7)]" />
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="glass-card absolute end-0 top-full z-50 mt-2 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-[hsl(var(--popover)/0.95)] shadow-popover"
        >
          <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.55)] px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold">{t("title")}</p>
              <p className="text-xs text-muted-foreground">{t("unread", { count: unread })}</p>
            </div>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
            >
              <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
              {t("markAll")}
            </button>
          </div>

          {loading && items.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
              {t("loading")}
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="max-h-[24rem] divide-y divide-[hsl(var(--border)/0.45)] overflow-y-auto">
              {items.slice(0, 10).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className="flex w-full gap-3 px-4 py-3.5 text-start transition-colors duration-150 hover:bg-[hsl(var(--card)/0.5)]"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                      {iconFor(item.type)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{item.title}</span>
                        {!item.readAt ? (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground/80">
                        {relativeTime(item.createdAt, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-[hsl(var(--border)/0.55)] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
