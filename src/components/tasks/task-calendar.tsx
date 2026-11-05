import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

type CalendarTask = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  priority: string;
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** TASK-05 — read-only month grid grouped by due date. */
export async function TaskCalendar({ tasks }: { tasks: CalendarTask[] }) {
  const t = await getTranslations("tasks.calendar");
  const locale = await getLocale();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first grid

  const byDay = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = dayKey(task.dueDate);
    byDay.set(key, [...(byDay.get(key) ?? []), task]);
  }

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(first);

  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 0, 1 + index), // Monday = 1 Jan 2024
    ),
  );

  const cells: Array<{ date: Date | null }> = [
    ...Array.from({ length: leading }, () => ({ date: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      date: new Date(year, month, index + 1),
    })),
  ];
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.55)] px-5 py-4">
        <h2 className="text-base font-semibold">{monthLabel}</h2>
        <span className="text-xs text-muted-foreground">{t("hint")}</span>
      </div>

      <div className="grid grid-cols-7 border-b border-[hsl(var(--border)/0.45)] bg-[hsl(var(--card)/0.32)]">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          if (!cell.date) {
            return <div key={`empty-${index}`} className="min-h-24 border-b border-e p-2" />;
          }

          const key = dayKey(cell.date);
          const dayTasks = byDay.get(key) ?? [];
          const isToday = key === dayKey(today);

          return (
            <div
              key={key}
              className={cn(
                "min-h-24 border-b border-e border-[hsl(var(--border)/0.45)] p-2 last:border-e-0",
                isToday && "bg-primary/[0.06]",
              )}
            >
              <p
                className={cn(
                  "mb-1 text-xs font-semibold text-muted-foreground",
                  isToday && "text-primary",
                )}
              >
                {cell.date.getDate()}
              </p>
              <ul className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className={cn(
                        "block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium hover:underline",
                        task.priority === "URGENT"
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : task.status === "DONE"
                            ? "bg-emerald-500/10 text-emerald-700 line-through dark:text-emerald-300"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {task.title}
                    </Link>
                  </li>
                ))}
                {dayTasks.length > 3 ? (
                  <li className="px-1.5 text-[10px] text-muted-foreground">
                    {t("more", { count: dayTasks.length - 3 })}
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
