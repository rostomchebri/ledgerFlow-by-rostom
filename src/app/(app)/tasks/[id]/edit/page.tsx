import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TaskForm } from "@/components/tasks/task-form";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { taskToFormValues } from "@/lib/tasks/form";
import { listTaskFormOptions } from "@/lib/tasks/options";
import { getTask } from "@/lib/tasks/service";

type EditTaskPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks.edit");
  return { title: t("title") };
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const t = await getTranslations("tasks.edit");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "task.write")) redirect("/tasks");

  const { id } = await params;
  const [task, options] = await Promise.all([getTask(firmId, id), listTaskFormOptions(firmId)]);
  if (!task) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <TaskForm
        mode="edit"
        taskId={task.id}
        initialValues={taskToFormValues(task)}
        clients={options.clients}
        members={options.members}
      />
    </div>
  );
}
