import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Columns3, Download, List, Plus, Search, UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { TaskBoard } from "@/components/tasks/task-board";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/clients/format";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { parseTaskListQuery, type TaskListQuery } from "@/lib/tasks/schema";
import { listTasks } from "@/lib/tasks/service";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks.meta");
  return { title: t("title"), description: t("description") };
}

type TasksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildHref(query: TaskListQuery, overrides: Partial<TaskListQuery> = {}): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status !== "ALL") params.set("status", next.status);
  if (next.priority !== "ALL") params.set("priority", next.priority);
  if (next.clientId) params.set("clientId", next.clientId);
  if (next.assigneeId) params.set("assigneeId", next.assigneeId);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.view !== "list") params.set("view", next.view);
  const suffix = params.toString();
  return suffix ? `/tasks?${suffix}` : "/tasks";
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HIGH: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  URGENT: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const t = await getTranslations("tasks");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const query = parseTaskListQuery(await searchParams);
  const result = await listTasks(firmId, query);
  const canWrite = can(role, "task.write");

  const views = [
    { key: "list" as const, label: t("views.list"), icon: List },
    { key: "board" as const, label: t("views.board"), icon: Columns3 },
    { key: "calendar" as const, label: t("views.calendar"), icon: CalendarDays },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Link href="/api/reports/tasks/export" className={buttonVariants({ variant: "outline" })}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t("export")}
            </Link>
            {canWrite ? (
              <>
                <Link href="/tasks/templates" className={buttonVariants({ variant: "outline" })}>
                  {t("templates")}
                </Link>
                <Link href="/tasks/new" className={buttonVariants({ variant: "default" })}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {t("new")}
                </Link>
              </>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass-soft inline-flex rounded-xl p-1">
          {views.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={buildHref(query, { view: key, page: 1 })}
              aria-current={query.view === key ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                query.view === key
                  ? "bg-[hsl(var(--card)/0.9)] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("total", { count: result.total })}</p>
      </div>

      <TaskFilters query={query} />

      {result.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("table.emptyTitle")}
          description={t("table.emptyBody")}
          action={
            canWrite ? (
              <Link href="/tasks/new" className={buttonVariants({ variant: "default" })}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("new")}
              </Link>
            ) : undefined
          }
        />
      ) : query.view === "board" ? (
        <TaskBoard tasks={result.items} />
      ) : query.view === "calendar" ? (
        <TaskCalendar tasks={result.items} />
      ) : (
        <>
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.32)] text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-5 py-3 text-start font-medium">{t("table.task")}</th>
                    <th className="hidden px-3 py-3 text-start font-medium md:table-cell">
                      {t("table.client")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium lg:table-cell">
                      {t("table.assignee")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium sm:table-cell">
                      {t("table.due")}
                    </th>
                    <th className="hidden px-3 py-3 text-start font-medium xl:table-cell">
                      {t("table.priority")}
                    </th>
                    <th className="px-5 py-3 text-start font-medium">{t("table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-[hsl(var(--border)/0.5)] transition-colors last:border-0 hover:bg-[hsl(var(--card)/0.45)]"
                    >
                      <td className="px-5 py-3.5">
                        <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                          {task.title}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground md:hidden">
                          {task.client?.name ?? t("noClient")}
                        </p>
                      </td>
                      <td className="hidden max-w-48 truncate px-3 py-3.5 text-muted-foreground md:table-cell">
                        {task.client?.name ?? t("noClient")}
                      </td>
                      <td className="hidden px-3 py-3.5 lg:table-cell">
                        {task.assignee ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
                            {task.assignee.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t("unassigned")}</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3.5 text-muted-foreground sm:table-cell">
                        {task.dueDate ? formatDate(task.dueDate, locale) : "—"}
                      </td>
                      <td className="hidden px-3 py-3.5 xl:table-cell">
                        <Badge className={cn("border", PRIORITY_STYLES[task.priority])}>
                          {t(`priorities.${task.priority}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {canWrite ? (
                          <TaskStatusSelect
                            taskId={task.id}
                            status={task.status}
                            className="h-8 w-32 text-xs"
                          />
                        ) : (
                          <Badge variant="outline">{t(`statuses.${task.status}`)}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result.pageCount > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("pagination.page", { page: result.page, pages: result.pageCount })}
              </p>
              <div className="flex items-center gap-2">
                {result.page > 1 ? (
                  <Link
                    href={buildHref(query, { page: result.page - 1 })}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("pagination.previous")}
                  </Link>
                ) : null}
                {result.page < result.pageCount ? (
                  <Link
                    href={buildHref(query, { page: result.page + 1 })}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("pagination.next")}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
