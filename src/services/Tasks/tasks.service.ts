// src/services/Tasks/tasks.service.ts
import { axiosInstance, functionsConfig } from "../../api/axios";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";

export type TasksQuery = {
  page: number;
  pageSize: number;

  sortField?: "createdAt" | "updatedAt" | "dueDate" | "title" | "priority" | "status";
  sortOrder?: "ascend" | "descend";

  search?: string;

  status?: TaskStatus; // undefined = ALL
  priority?: TaskPriority; // undefined = ALL

  dueFrom?: string;
  dueTo?: string;
};

export type PagedResult<T> = { items: T[]; total: number };

const DEFAULT_SORT_FIELD: NonNullable<TasksQuery["sortField"]> = "updatedAt";
const DEFAULT_SORT_ORDER: NonNullable<TasksQuery["sortOrder"]> = "descend";

export async function listTasks(q: TasksQuery): Promise<PagedResult<Task>> {
  const params: TasksQuery = {
    ...q,
    sortField: q.sortField ?? DEFAULT_SORT_FIELD,
    sortOrder: q.sortOrder ?? DEFAULT_SORT_ORDER,
    search: (q.search ?? "").trim() || undefined,
    dueFrom: q.dueFrom || undefined,
    dueTo: q.dueTo || undefined,
  };

  const res = await axiosInstance.get<PagedResult<Task>>("/listTasks", {
    ...functionsConfig(),
    params,
  });

  return res.data;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const res = await axiosInstance.get<Task>("/getTaskById", {
    ...functionsConfig(),
    params: { id },
  });
  return res.data ?? null;
}

export async function createTask(payload: {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
}): Promise<string> {
  const res = await axiosInstance.post<{ id: string }>("/createTask", payload, {
    ...functionsConfig(),
  });
  return res.data.id;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "dueDate">>
): Promise<void> {
  await axiosInstance.patch("/updateTask", patch, {
    ...functionsConfig(),
    params: { id },
  });
}

export async function softDeleteTask(id: string): Promise<void> {
  await axiosInstance.delete("/softDeleteTask", {
    ...functionsConfig(),
    params: { id },
  });
}

export async function bulkMarkDone(ids: string[]): Promise<void> {
  await axiosInstance.post("/bulkMarkDone", { ids }, { ...functionsConfig() });
}
