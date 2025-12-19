export type TaskStatus = "Todo" | "InProgress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  ownerUid: string;
  isDeleted?: boolean;
};
