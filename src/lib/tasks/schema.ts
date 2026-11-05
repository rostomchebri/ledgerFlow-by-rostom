import { z } from "zod";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TASK_RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const optionalId = z.preprocess(emptyToUndefined, z.string().trim().min(1).max(64).optional());

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? value : date;
}, z.date().optional());

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
    description: optionalText(4000),
    clientId: optionalId,
    assigneeId: optionalId,
    status: z.enum(TASK_STATUSES).default("TODO"),
    priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
    dueDate: optionalDate,
    recurrence: z.enum(TASK_RECURRENCES).default("NONE"),
    templateId: optionalId,
    checklist: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  })
  .strict();

export type TaskInput = z.infer<typeof taskInputSchema>;

export const taskUpdateSchema = taskInputSchema
  .omit({ title: true })
  .partial()
  .extend({
    title: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export const taskStatusUpdateSchema = z.object({ status: z.enum(TASK_STATUSES) }).strict();

export const taskCommentSchema = z
  .object({ body: z.string().trim().min(1, "Comment cannot be empty.").max(4000) })
  .strict();

export const taskTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    description: optionalText(4000),
    priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
    recurrence: z.enum(TASK_RECURRENCES).default("NONE"),
    defaultDueOffsetDays: z.coerce.number().int().min(0).max(365).optional(),
  })
  .strict();

export type TaskTemplateInput = z.infer<typeof taskTemplateSchema>;

/**
 * TASK-03 — overrides when instantiating a template. Unlike `taskInputSchema`,
 * this schema has **no defaults** so omitted fields keep the template's values.
 */
export const taskFromTemplateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalText(4000),
    clientId: optionalId,
    assigneeId: optionalId,
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: optionalDate,
    recurrence: z.enum(TASK_RECURRENCES).optional(),
  })
  .strict();

export type TaskFromTemplateInput = z.infer<typeof taskFromTemplateSchema>;

export const TASK_VIEWS = ["list", "board", "calendar"] as const;

export function parseTaskListQuery(params: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const rawStatus = first(params.status)?.toUpperCase();
  const rawPriority = first(params.priority)?.toUpperCase();
  const rawView = first(params.view);
  const page = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    status: TASK_STATUSES.includes(rawStatus as never)
      ? (rawStatus as (typeof TASK_STATUSES)[number])
      : ("ALL" as const),
    priority: TASK_PRIORITIES.includes(rawPriority as never)
      ? (rawPriority as (typeof TASK_PRIORITIES)[number])
      : ("ALL" as const),
    clientId: first(params.clientId)?.slice(0, 64) ?? "",
    assigneeId: first(params.assigneeId)?.slice(0, 64) ?? "",
    view: TASK_VIEWS.includes(rawView as never)
      ? (rawView as (typeof TASK_VIEWS)[number])
      : ("list" as const),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export type TaskListQuery = ReturnType<typeof parseTaskListQuery>;
