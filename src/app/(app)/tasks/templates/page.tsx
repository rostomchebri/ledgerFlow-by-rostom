import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Repeat2 } from "lucide-react";

import { TaskTemplateForm } from "@/components/tasks/task-template-form";
import { UseTemplateButton } from "@/components/tasks/use-template-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireFirmContext } from "@/lib/firm-context";
import { can } from "@/lib/rbac";
import { listTaskTemplates } from "@/lib/tasks/service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tasks.templatesPage");
  return { title: t("title"), description: t("description") };
}

export default async function TaskTemplatesPage() {
  const t = await getTranslations("tasks.templatesPage");
  const { firmId, role } = await requireFirmContext();
  if (!can(role, "task.write")) redirect("/tasks");

  const templates = await listTaskTemplates(firmId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link href="/tasks" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>

      <div className="space-y-2">
        <h1 className="text-gradient text-[28px] font-bold tracking-[-0.035em]">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("existingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border)/0.5)]">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{template.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{template.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{t(`priorities.${template.priority}`)}</Badge>
                      {template.recurrence !== "NONE" ? (
                        <Badge variant="outline">
                          <Repeat2 aria-hidden="true" className="h-3 w-3" />
                          {t(`recurrences.${template.recurrence}`)}
                        </Badge>
                      ) : null}
                      {template.defaultDueOffsetDays !== null ? (
                        <span className="text-[11px] text-muted-foreground">
                          {t("offsetValue", { days: template.defaultDueOffsetDays })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <UseTemplateButton templateId={template.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("newTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
