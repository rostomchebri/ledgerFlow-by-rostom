import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, SlidersHorizontal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskListQuery } from "@/lib/tasks/schema";
import { cn } from "@/lib/utils";

export async function TaskFilters({ query }: { query: TaskListQuery }) {
  const t = await getTranslations("tasks.filters");

  return (
    <form
      method="get"
      className="glass-card flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center"
    >
      <input type="hidden" name="view" value={query.view} />
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          name="q"
          defaultValue={query.q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="ps-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <Select
          name="status"
          defaultValue={query.status}
          aria-label={t("status")}
          className="sm:w-40"
        >
          <option value="ALL">{t("allStatuses")}</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statusOptions.${status}`)}
            </option>
          ))}
        </Select>

        <Select
          name="priority"
          defaultValue={query.priority}
          aria-label={t("priority")}
          className="sm:w-36"
        >
          <option value="ALL">{t("allPriorities")}</option>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {t(`priorityOptions.${priority}`)}
            </option>
          ))}
        </Select>

        <button type="submit" className={cn(buttonVariants({ variant: "default" }), "col-span-1")}>
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          {t("apply")}
        </button>

        <Link
          href={`/tasks?view=${query.view}`}
          className={cn(buttonVariants({ variant: "outline" }), "col-span-1")}
        >
          {t("clear")}
        </Link>
      </div>
    </form>
  );
}
