"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { can, type FirmRole } from "@/lib/rbac";

type ShortcutsDialogProps = {
  open: boolean;
  role: FirmRole;
  onClose: () => void;
};

type ShortcutRow = {
  keys: string[];
  label: string;
};

type ShortcutGroup = {
  key: string;
  title: string;
  rows: ShortcutRow[];
};

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="glass-soft inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-1 font-sans text-[11px] font-semibold text-foreground/80">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({ open, role, onClose }: ShortcutsDialogProps) {
  const t = useTranslations("shortcuts");
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  if (!open) return null;

  const groups: ShortcutGroup[] = [
    {
      key: "general",
      title: t("groups.general"),
      rows: [
        { keys: ["⌘", "K"], label: t("items.command") },
        { keys: ["?"], label: t("items.help") },
      ],
    },
    {
      key: "navigation",
      title: t("groups.navigation"),
      rows: [
        { keys: ["g", "d"], label: t("items.dashboard") },
        { keys: ["g", "t"], label: t("items.transactions") },
        { keys: ["g", "i"], label: t("items.invoices") },
        { keys: ["g", "c"], label: t("items.clients") },
        { keys: ["g", "r"], label: t("items.reports") },
        { keys: ["g", "o"], label: t("items.documents") },
        { keys: ["g", "k"], label: t("items.tasks") },
        { keys: ["g", "n"], label: t("items.notifications") },
        { keys: ["g", "s"], label: t("items.settings") },
      ],
    },
  ];

  const createRows: ShortcutRow[] = [];
  if (can(role, "client.write")) {
    createRows.push({ keys: ["n", "c"], label: t("items.newClient") });
    createRows.push({ keys: ["n", "t"], label: t("items.newTransaction") });
  }
  if (can(role, "invoice.write")) {
    createRows.push({ keys: ["n", "i"], label: t("items.newInvoice") });
  }
  if (can(role, "task.write")) {
    createRows.push({ keys: ["n", "k"], label: t("items.newTask") });
  }
  if (createRows.length > 0) {
    groups.push({ key: "create", title: t("groups.create"), rows: createRows });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label={t("close")}
        tabIndex={-1}
        onClick={close}
        className="sheet-backdrop absolute inset-0 cursor-default bg-[hsl(var(--background)/0.55)]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onKeyDown={onKeyDown}
        className="glass-card palette-enter relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[hsl(var(--popover)/0.97)] shadow-popover"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border)/0.55)] px-5 py-4">
          <div>
            <h2 id="shortcuts-title" className="text-base font-semibold">
              {t("title")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("description")}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="glass-icon-button h-9 w-9 shrink-0"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {groups.map((group) => (
              <section key={group.key}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="space-y-1.5">
                  {group.rows.map((row) => (
                    <li
                      key={`${row.label}-${row.keys.join("-")}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"
                    >
                      <span className="text-sm text-foreground/90">{row.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {row.keys.map((key, index) => (
                          <span key={`${key}-${index}`} className="flex items-center gap-1">
                            {index > 0 ? (
                              <span className="text-[10px] text-muted-foreground">{t("then")}</span>
                            ) : null}
                            <Kbd>{key}</Kbd>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
