import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { TaskForm } from "@/components/tasks/task-form";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { EMPTY_TASK_FORM_VALUES } from "@/lib/tasks/form";
import { listTaskFormOptions } from "@/lib/tasks/options";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks.createPage");
  return { title: t("title") };
}

export default async function NewTaskPage() {
  const t = await getTranslations("tasks.createPage");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "task.write")) redirect("/tasks");

  const options = await listTaskFormOptions(firmId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <TaskForm
        mode="create"
        initialValues={EMPTY_TASK_FORM_VALUES}
        clients={options.clients}
        members={options.members}
      />
    </div>
  );
}
