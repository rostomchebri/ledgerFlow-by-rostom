import type { Task, TaskPriority, TaskRecurrence, TaskStatus } from "@prisma/client";

import type { TaskInput } from "./schema";

export type TaskFormValues = {
  title: string;
  description: string;
  clientId: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  dueDate: string;
  checklist: string;
};

export const EMPTY_TASK_FORM_VALUES: TaskFormValues = {
  title: "",
  description: "",
  clientId: "",
  assigneeId: "",
  status: "TODO",
  priority: "MEDIUM",
  recurrence: "NONE",
  dueDate: "",
  checklist: "",
};

export function taskToFormValues(
  task: Pick<
    Task,
    | "title"
    | "description"
    | "clientId"
    | "assigneeId"
    | "status"
    | "priority"
    | "recurrence"
    | "dueDate"
  >,
): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    clientId: task.clientId ?? "",
    assigneeId: task.assigneeId ?? "",
    status: task.status,
    priority: task.priority,
    recurrence: task.recurrence,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
    checklist: "",
  };
}

/** Converts the string form into the JSON payload accepted by the API. */
export function taskFormToPayload(values: TaskFormValues) {
  const checklist = values.checklist
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    title: values.title,
    description: values.description || undefined,
    clientId: values.clientId || undefined,
    assigneeId: values.assigneeId || undefined,
    status: values.status,
    priority: values.priority,
    recurrence: values.recurrence,
    dueDate: values.dueDate || undefined,
    ...(checklist.length ? { checklist } : {}),
  };
}

export type TaskPayload = ReturnType<typeof taskFormToPayload>;

export function isTaskInput(value: TaskPayload): value is TaskPayload & TaskInput {
  return Boolean(value.title);
}
