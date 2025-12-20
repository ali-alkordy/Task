// src/services/Tasks/tasksStats.service.ts
import type { Dayjs } from "dayjs";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";
import { axiosInstance, functionsConfig } from "../../api/axios";

export type StatsPeriod = "ALL" | "7D" | "30D" | "90D" | "CUSTOM";

export type TaskStats = {
  total: number;
  completionRate: number;

  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;

  withDue: number;
  overdue: number;
  dueToday: number;
  dueNext7: number;

  overdueTasks: Task[];
  dueSoonTasks: Task[];
};

export async function getTaskStats(params: {
  period: StatsPeriod;
  from?: Dayjs | null;
  to?: Dayjs | null;
  limit?: number;
}): Promise<TaskStats> {
  const { period, from, to, limit = 8 } = params;

  const res = await axiosInstance.get<TaskStats>("/getTaskStats", {
    ...functionsConfig(), // ✅ use Functions baseURL
    params: {
      period,
      from: period === "CUSTOM" && from ? from.toISOString() : undefined,
      to: period === "CUSTOM" && to ? to.toISOString() : undefined,
      limit,
    },
  });

  return res.data;
}
