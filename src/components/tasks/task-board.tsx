import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, UserRound } from "lucide-react";

import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/clients/format";
import { TASK_STATUSES } from "@/lib/tasks/schema";
import { cn } from "@/lib/utils";

type BoardTask = {
  id: string;
  title: string;
  status: (typeof TASK_STATUSES)[number];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | null;
  client: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  _count: { comments: number; checklist: number };
};

const PRIORITY_STYLES: Record<BoardTask["priority"], string> = {
  LOW: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HIGH: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  URGENT: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export async function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  const t = await getTranslations("tasks");
  const locale = await getLocale();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            className="glass-card flex min-h-[12rem] flex-col gap-3 rounded-2xl p-3"
          >
            <header className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-sm font-semibold">{t(`statuses.${status}`)}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {columnTasks.length}
              </span>
            </header>

            {columnTasks.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                {t("board.empty")}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {columnTasks.map((task) => (
                  <li key={task.id} className="glass-soft rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="line-clamp-2 text-sm font-semibold hover:underline"
                      >
                        {task.title}
                      </Link>
                      <Badge className={cn("shrink-0 border", PRIORITY_STYLES[task.priority])}>
                        {t(`priorities.${task.priority}`)}
                      </Badge>
                    </div>

                    {task.client ? (
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {task.client.name}
                      </p>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {task.dueDate ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays aria-hidden="true" className="h-3 w-3" />
                          {formatDate(task.dueDate, locale)}
                        </span>
                      ) : null}
                      {task.assignee ? (
                        <span className="inline-flex items-center gap-1">
                          <UserRound aria-hidden="true" className="h-3 w-3" />
                          {task.assignee.name}
                        </span>
                      ) : null}
                      {task._count.checklist > 0 ? (
                        <span>
                          {task._count.checklist} {t("board.items")}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <TaskStatusSelect
                        taskId={task.id}
                        status={task.status}
                        className="h-8 text-xs"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
