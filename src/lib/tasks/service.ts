import "server-only";

import type { Prisma, Task, TaskRecurrence, TaskStatus } from "@prisma/client";

import { recordAudit } from "@/lib/audit/service";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";

import type { TaskInput, TaskListQuery, TaskTemplateInput, TaskUpdateInput } from "./schema";

export const TASK_PAGE_SIZE = 24;

export class TaskNotFoundError extends Error {
  constructor() {
    super("Task not found.");
    this.name = "TaskNotFoundError";
  }
}

export class TaskReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskReferenceError";
  }
}

function taskWhere(
  firmId: string,
  query: Pick<TaskListQuery, "q" | "status" | "priority" | "clientId" | "assigneeId">,
): Prisma.TaskWhereInput {
  return {
    firmId,
    ...(query.status !== "ALL" ? { status: query.status } : {}),
    ...(query.priority !== "ALL" ? { priority: query.priority } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { client: { name: { contains: query.q, mode: "insensitive" } } },
            { assignee: { name: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listTasks(firmId: string, query: TaskListQuery) {
  const where = taskWhere(firmId, query);
  const paginated = query.view === "list";
  const take = paginated ? TASK_PAGE_SIZE : 500;

  const [items, total] = await Promise.all([
    db.task.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { comments: true, checklist: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      skip: paginated ? (query.page - 1) * take : 0,
      take,
    }),
    db.task.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: take,
    pageCount: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getTask(firmId: string, taskId: string) {
  return db.task.findFirst({
    where: { id: taskId, firmId },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      checklist: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
    },
  });
}

async function assertReferences(firmId: string, input: TaskInput | TaskUpdateInput) {
  if (input.clientId) {
    const client = await db.client.findFirst({
      where: { id: input.clientId, firmId },
      select: { id: true },
    });
    if (!client) throw new TaskReferenceError("The selected client does not belong to this firm.");
  }

  if (input.assigneeId) {
    const member = await db.firmMember.findFirst({
      where: { userId: input.assigneeId, firmId },
      select: { id: true },
    });
    if (!member) throw new TaskReferenceError("The selected assignee is not a firm member.");
  }

  if (input.templateId) {
    const template = await db.taskTemplate.findFirst({
      where: { id: input.templateId, firmId },
      select: { id: true },
    });
    if (!template)
      throw new TaskReferenceError("The selected template does not belong to this firm.");
  }
}

export async function createTask(firmId: string, input: TaskInput, actorId: string): Promise<Task> {
  await assertReferences(firmId, input);

  const task = await db.task.create({
    data: {
      firmId,
      title: input.title,
      description: input.description,
      clientId: input.clientId,
      assigneeId: input.assigneeId,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      recurrence: input.recurrence,
      templateId: input.templateId,
      createdById: actorId,
      completedAt: input.status === "DONE" ? new Date() : null,
      checklist: input.checklist?.length
        ? {
            create: input.checklist.map((label, index) => ({
              label,
              position: index,
            })),
          }
        : undefined,
    },
  });

  await recordAudit({
    firmId,
    actorId,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    metadata: { title: task.title, status: task.status },
  });

  if (task.assigneeId && task.assigneeId !== actorId) {
    await createNotification({
      firmId,
      userId: task.assigneeId,
      type: "TASK_DUE",
      title: "New task assigned",
      body: task.title,
      href: `/tasks/${task.id}`,
    });
  }

  return task;
}

export async function updateTask(
  firmId: string,
  taskId: string,
  input: TaskUpdateInput,
  actorId: string,
): Promise<Task> {
  const existing = await db.task.findFirst({ where: { id: taskId, firmId } });
  if (!existing) throw new TaskNotFoundError();

  await assertReferences(firmId, input);

  const { checklist, ...fields } = input;
  const nextStatus = input.status;
  const data: Prisma.TaskUncheckedUpdateInput = {
    ...fields,
    ...(nextStatus ? { completedAt: nextStatus === "DONE" ? new Date() : null } : {}),
  };

  const task = await db.$transaction(async (tx) => {
    const updated = await tx.task.update({ where: { id: existing.id }, data });

    // Checklist rows are a relation, so they cannot travel through the scalar
    // update payload. Replace them when the caller supplied a new list.
    if (checklist !== undefined) {
      await tx.checklistItem.deleteMany({ where: { taskId: updated.id } });
      if (checklist.length) {
        await tx.checklistItem.createMany({
          data: checklist.map((label, index) => ({
            taskId: updated.id,
            label,
            position: index,
          })),
        });
      }
    }

    return updated;
  });

  await recordAudit({
    firmId,
    actorId,
    action: nextStatus && nextStatus !== existing.status ? "task.status_changed" : "task.updated",
    entityType: "task",
    entityId: task.id,
    metadata: {
      title: task.title,
      from: existing.status,
      to: task.status,
    },
  });

  return task;
}

export async function setTaskStatus(
  firmId: string,
  taskId: string,
  status: TaskStatus,
  actorId: string,
): Promise<Task> {
  const existing = await db.task.findFirst({ where: { id: taskId, firmId } });
  if (!existing) throw new TaskNotFoundError();

  const task = await db.task.update({
    where: { id: existing.id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });

  await recordAudit({
    firmId,
    actorId,
    action: "task.status_changed",
    entityType: "task",
    entityId: task.id,
    metadata: { from: existing.status, to: status },
  });

  if (status === "DONE" && existing.recurrence !== "NONE") {
    await createNextRecurringTask(existing, actorId);
  }

  return task;
}

function advanceDate(date: Date, recurrence: TaskRecurrence): Date {
  const next = new Date(date);
  switch (recurrence) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      break;
  }
  return next;
}

async function createNextRecurringTask(previous: Task, actorId: string): Promise<void> {
  const dueDate = previous.dueDate ? advanceDate(previous.dueDate, previous.recurrence) : null;

  const next = await db.task.create({
    data: {
      firmId: previous.firmId,
      clientId: previous.clientId,
      title: previous.title,
      description: previous.description,
      priority: previous.priority,
      assigneeId: previous.assigneeId,
      recurrence: previous.recurrence,
      templateId: previous.templateId,
      createdById: actorId,
      dueDate,
    },
  });

  await recordAudit({
    firmId: previous.firmId,
    actorId,
    action: "task.created",
    entityType: "task",
    entityId: next.id,
    metadata: { title: next.title, recurrence: previous.recurrence, generatedFrom: previous.id },
  });
}

export async function deleteTask(firmId: string, taskId: string, actorId: string): Promise<void> {
  const existing = await db.task.findFirst({ where: { id: taskId, firmId } });
  if (!existing) throw new TaskNotFoundError();

  await db.task.delete({ where: { id: existing.id } });

  await recordAudit({
    firmId,
    actorId,
    action: "task.deleted",
    entityType: "task",
    entityId: existing.id,
    metadata: { title: existing.title },
  });
}

export async function addTaskComment(input: {
  firmId: string;
  taskId: string;
  authorId: string;
  body: string;
}) {
  const task = await db.task.findFirst({
    where: { id: input.taskId, firmId: input.firmId },
    select: { id: true, title: true },
  });
  if (!task) throw new TaskNotFoundError();

  const comment = await db.taskComment.create({
    data: { taskId: task.id, authorId: input.authorId, body: input.body },
    include: { author: { select: { id: true, name: true } } },
  });

  await recordAudit({
    firmId: input.firmId,
    actorId: input.authorId,
    action: "task.comment_added",
    entityType: "task",
    entityId: task.id,
    metadata: { task: task.title },
  });

  return comment;
}

export async function addChecklistItem(input: { firmId: string; taskId: string; label: string }) {
  const task = await db.task.findFirst({
    where: { id: input.taskId, firmId: input.firmId },
    select: { id: true },
  });
  if (!task) throw new TaskNotFoundError();

  const count = await db.checklistItem.count({ where: { taskId: task.id } });
  return db.checklistItem.create({
    data: { taskId: task.id, label: input.label, position: count },
  });
}

export async function toggleChecklistItem(input: {
  firmId: string;
  taskId: string;
  itemId: string;
  done: boolean;
}) {
  const item = await db.checklistItem.findFirst({
    where: { id: input.itemId, taskId: input.taskId, task: { firmId: input.firmId } },
    select: { id: true },
  });
  if (!item) throw new TaskNotFoundError();

  return db.checklistItem.update({
    where: { id: item.id },
    data: { done: input.done },
  });
}

export async function listTaskTemplates(firmId: string) {
  return db.taskTemplate.findMany({ where: { firmId }, orderBy: { name: "asc" } });
}

export async function createTaskTemplate(firmId: string, input: TaskTemplateInput) {
  return db.taskTemplate.create({ data: { firmId, ...input } });
}

export async function createTaskFromTemplate(
  firmId: string,
  templateId: string,
  actorId: string,
  overrides: Partial<TaskInput> = {},
) {
  const template = await db.taskTemplate.findFirst({ where: { id: templateId, firmId } });
  if (!template) throw new TaskNotFoundError();

  const dueDate =
    template.defaultDueOffsetDays !== null
      ? new Date(Date.now() + template.defaultDueOffsetDays * 24 * 60 * 60 * 1000)
      : undefined;

  return createTask(
    firmId,
    {
      title: template.title,
      description: template.description ?? undefined,
      priority: template.priority,
      recurrence: template.recurrence,
      dueDate,
      status: "TODO",
      ...overrides,
    },
    actorId,
  );
}

export async function listCalendarTasks(firmId: string, start: Date, end: Date) {
  return db.task.findMany({
    where: {
      firmId,
      dueDate: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function findDueTasks(now: Date) {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return db.task.findMany({
    where: {
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { not: null, lte: endOfDay },
      assigneeId: { not: null },
    },
    include: {
      firm: { select: { name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      client: { select: { name: true } },
    },
    take: 500,
  });
}
