"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  CheckSquare,
  FolderOpen,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatCurrency } from "@/lib/finance/format";
import { NAV_ITEMS } from "@/lib/navigation";
import { can, type FirmRole } from "@/lib/rbac";
import {
  EMPTY_SEARCH_RESULTS,
  SEARCH_MIN_LENGTH,
  type SearchResults,
} from "@/lib/search";
import { cn } from "@/lib/utils";

type CommandPaletteProps = {
  open: boolean;
  role: FirmRole;
  onClose: () => void;
};

type PaletteEntry = {
  id: string;
  label: string;
  meta?: string;
  badge?: string;
  href: string;
  icon: LucideIcon;
};

type PaletteSection = {
  key: string;
  title: string;
  items: PaletteEntry[];
};

type RecentCommand = {
  id: string;
  label: string;
  href: string;
};

const RECENT_KEY = "ledgerflow-recent-commands";
const RECENT_LIMIT = 4;

function readRecentCommands(): RecentCommand[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentCommand =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as RecentCommand).id === "string" &&
          typeof (entry as RecentCommand).label === "string" &&
          typeof (entry as RecentCommand).href === "string",
      )
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function rememberCommand(entry: PaletteEntry) {
  try {
    const next = [
      { id: entry.id, label: entry.label, href: entry.href },
      ...readRecentCommands().filter((item) => item.href !== entry.href),
    ].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private browsing can reject storage; recents are a convenience only.
  }
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

export function CommandPalette({ open, role, onClose }: CommandPaletteProps) {
  const t = useTranslations("command");
  const tNav = useTranslations("nav");
  const tClients = useTranslations("clients.statuses");
  const tInvoices = useTranslations("invoices.statuses");
  const tTasks = useTranslations("tasks.statuses");
  const tTransactions = useTranslations("transactions.types");
  const locale = useLocale();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_SEARCH_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<RecentCommand[]>([]);

  // Reset transient state every time the palette is opened.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setResults(EMPTY_SEARCH_RESULTS);
    setError(false);
    setActiveIndex(0);
    setRecent(readRecentCommands());

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

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

  // Debounced, abortable search. Short queries stay client-side only.
  useEffect(() => {
    if (!open) return;

    const term = query.trim();
    if (term.length < SEARCH_MIN_LENGTH) {
      setResults(EMPTY_SEARCH_RESULTS);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Search failed with ${response.status}`);
          const payload = (await response.json()) as { data: SearchResults };
          setResults(payload.data);
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setError(true);
          setResults(EMPTY_SEARCH_RESULTS);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const commands = useMemo<PaletteEntry[]>(() => {
    const navigation: PaletteEntry[] = NAV_ITEMS.map((item) => ({
      id: `nav-${item.key}`,
      label: tNav(item.key),
      href: item.href,
      icon: item.icon,
    }));

    const actions: PaletteEntry[] = [];
    if (can(role, "client.write")) {
      actions.push({
        id: "create-client",
        label: t("actions.newClient"),
        href: "/clients/new",
        icon: Plus,
      });
    }
    if (can(role, "invoice.write")) {
      actions.push({
        id: "create-invoice",
        label: t("actions.newInvoice"),
        href: "/invoices/new",
        icon: ReceiptText,
      });
    }
    if (can(role, "client.write")) {
      actions.push({
        id: "create-transaction",
        label: t("actions.newTransaction"),
        href: "/transactions/new",
        icon: ArrowLeftRight,
      });
    }
    if (can(role, "task.write")) {
      actions.push({
        id: "create-task",
        label: t("actions.newTask"),
        href: "/tasks/new",
        icon: CheckSquare,
      });
    }

    return [...navigation, ...actions];
  }, [role, t, tNav]);

  const sections = useMemo<PaletteSection[]>(() => {
    const term = query.trim();
    const next: PaletteSection[] = [];

    if (!term) {
      if (recent.length > 0) {
        next.push({
          key: "recent",
          title: t("groups.recent"),
          items: recent.map((item) => ({
            id: `recent-${item.id}`,
            label: item.label,
            href: item.href,
            icon: FolderOpen,
          })),
        });
      }

      next.push({
        key: "navigation",
        title: t("groups.navigation"),
        items: commands.filter((item) => item.id.startsWith("nav-")),
      });
      next.push({
        key: "actions",
        title: t("groups.actions"),
        items: commands.filter((item) => item.id.startsWith("create-")),
      });
      return next;
    }

    const matchedCommands = commands.filter(
      (item) => matchesQuery(item.label, term) || matchesQuery(item.id, term),
    );
    if (matchedCommands.length > 0) {
      next.push({
        key: "commands",
        title: t("groups.navigation"),
        items: matchedCommands,
      });
    }

    if (results.clients.length > 0) {
      next.push({
        key: "clients",
        title: t("groups.clients"),
        items: results.clients.map((client) => ({
          id: `client-${client.id}`,
          label: client.name,
          meta: client.email ?? undefined,
          badge: tClients(client.status),
          href: client.href,
          icon: Users,
        })),
      });
    }

    if (results.invoices.length > 0) {
      next.push({
        key: "invoices",
        title: t("groups.invoices"),
        items: results.invoices.map((invoice) => ({
          id: `invoice-${invoice.id}`,
          label: invoice.number,
          meta: `${invoice.clientName} · ${formatCurrency(invoice.total, locale)}`,
          badge: tInvoices(invoice.status),
          href: invoice.href,
          icon: ReceiptText,
        })),
      });
    }

    if (results.transactions.length > 0) {
      next.push({
        key: "transactions",
        title: t("groups.transactions"),
        items: results.transactions.map((transaction) => ({
          id: `transaction-${transaction.id}`,
          label: transaction.description,
          meta: `${formatCurrency(transaction.amount, locale)}${
            transaction.clientName ? ` · ${transaction.clientName}` : ""
          }`,
          badge: tTransactions(transaction.type),
          href: transaction.href,
          icon: ArrowLeftRight,
        })),
      });
    }

    if (results.tasks.length > 0) {
      next.push({
        key: "tasks",
        title: t("groups.tasks"),
        items: results.tasks.map((task) => ({
          id: `task-${task.id}`,
          label: task.title,
          meta: task.clientName ?? undefined,
          badge: tTasks(task.status),
          href: task.href,
          icon: CheckSquare,
        })),
      });
    }

    return next;
  }, [commands, query, recent, results, t, tClients, tInvoices, tTasks, tTransactions, locale]);

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const close = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const select = useCallback(
    (entry: PaletteEntry | undefined) => {
      if (!entry) return;
      rememberCommand(entry);
      close();
      router.push(entry.href);
    },
    [close, router],
  );

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (flatItems.length === 0 ? 0 : (index + 1) % flatItems.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatItems.length === 0 ? 0 : (index - 1 + flatItems.length) % flatItems.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, flatItems.length - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      select(flatItems[activeIndex]);
    }
  }

  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href]',
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  const term = query.trim();
  const showEmpty = term.length >= SEARCH_MIN_LENGTH && !loading && !error && flatItems.length === 0;

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <button
        type="button"
        aria-label={t("close")}
        tabIndex={-1}
        onClick={close}
        className="sheet-backdrop absolute inset-0 cursor-default bg-[hsl(var(--background)/0.55)]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        onKeyDown={handlePanelKeyDown}
        className="glass-card palette-enter relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-[hsl(var(--popover)/0.97)] shadow-popover"
      >
        <div className="relative border-b border-[hsl(var(--border)/0.55)]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-autocomplete="list"
            aria-activedescendant={flatItems[activeIndex] ? `command-${flatItems[activeIndex].id}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("placeholder")}
            className="h-14 w-full bg-transparent pe-12 ps-11 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          {loading ? (
            <Loader2
              aria-hidden="true"
              className="absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : (
            <kbd className="glass-soft pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        <div ref={listRef} id="command-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.key} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {section.title}
              </p>
              {section.items.map((item) => {
                const index = runningIndex;
                runningIndex += 1;
                const active = index === activeIndex;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    id={`command-${item.id}`}
                    data-index={index}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => select(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors duration-150",
                      active
                        ? "bg-[hsl(var(--primary)/0.12)] text-foreground"
                        : "text-foreground/90 hover:bg-[hsl(var(--card)/0.6)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                        active
                          ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.16)] text-primary"
                          : "border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.6)] text-muted-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.meta ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.meta}
                        </span>
                      ) : null}
                    </span>
                    {item.badge ? (
                      <span className="shrink-0 rounded-full border border-[hsl(var(--border)/0.6)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}

          {term.length > 0 && term.length < SEARCH_MIN_LENGTH ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("keepTyping")}</p>
          ) : null}

          {showEmpty ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("empty", { query: term })}
            </p>
          ) : null}

          {error ? (
            <p className="px-3 py-8 text-center text-sm text-destructive">{t("error")}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border)/0.55)] px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="glass-soft rounded px-1.5 py-0.5 font-sans font-semibold">↑↓</kbd>
            {t("footerNavigate")}
            <kbd className="glass-soft ms-2 rounded px-1.5 py-0.5 font-sans font-semibold">↵</kbd>
            {t("footerSelect")}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <kbd className="glass-soft rounded px-1.5 py-0.5 font-sans font-semibold">esc</kbd>
            {t("footerClose")}
          </span>
        </div>
      </div>
    </div>
  );
}
