import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Pencil,
  Repeat2,
  UserRound,
} from "lucide-react";

import { TaskChecklist } from "@/components/tasks/task-checklist";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/clients/format";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { getTask } from "@/lib/tasks/service";

type TaskDetailPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: TaskDetailPageProps): Promise<Metadata> {
  const { firmId } = await requireFirmContext();
  const { id } = await params;
  const task = await getTask(firmId, id);
  const t = await getTranslations("tasks.detail");
  return { title: task?.title ?? t("fallbackTitle") };
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  MEDIUM: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HIGH: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  URGENT: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const t = await getTranslations("tasks.detail");
  const locale = await getLocale();
  const { firmId, role } = await requireFirmContext();
  const { id } = await params;
  const task = await getTask(firmId, id);
  if (!task) notFound();

  const canWrite = can(role, "task.write");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/tasks" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tasks/${task.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {t("edit")}
            </Link>
            <TaskDeleteButton taskId={task.id} />
          </div>
        ) : null}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`border ${PRIORITY_STYLES[task.priority]}`}>
                {t(`priorities.${task.priority}`)}
              </Badge>
              {task.recurrence !== "NONE" ? (
                <Badge variant="outline">
                  <Repeat2 aria-hidden="true" className="h-3 w-3" />
                  {t(`recurrences.${task.recurrence}`)}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em]">
              {task.title}
            </h1>
            {task.description ? (
              <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {task.description}
              </p>
            ) : null}
          </div>

          {canWrite ? (
            <TaskStatusSelect taskId={task.id} status={task.status} className="h-10 w-40 text-sm" />
          ) : (
            <Badge variant="outline">{t(`statuses.${task.status}`)}</Badge>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[hsl(var(--border)/0.55)] pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
              {t("client")}
            </dt>
            <dd className="font-medium">{task.client?.name ?? t("noClient")}</dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
              {t("assignee")}
            </dt>
            <dd className="font-medium">{task.assignee?.name ?? t("unassigned")}</dd>
          </div>
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
              {t("dueDate")}
            </dt>
            <dd className="font-medium">
              {task.dueDate ? formatDate(task.dueDate, locale) : t("noDueDate")}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">{t("createdBy")}</dt>
            <dd className="font-medium">{task.createdBy?.name ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <MessageSquare aria-hidden="true" className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("commentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskComments
              taskId={task.id}
              initialComments={task.comments.map((comment) => ({
                id: comment.id,
                body: comment.body,
                createdAt: comment.createdAt.toISOString(),
                author: comment.author,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CheckSquare aria-hidden="true" className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("checklistTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskChecklist
              taskId={task.id}
              initialItems={task.checklist.map((item) => ({
                id: item.id,
                label: item.label,
                done: item.done,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
