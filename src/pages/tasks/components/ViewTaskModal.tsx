import { useEffect } from "react";
import { Modal, Spin, Tag, Divider } from "antd";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";

import { toast } from "../../../utils/toast";
import type { Task, TaskPriority, TaskStatus } from "../../../types/task";
import { getTaskById } from "../../../services/Tasks/tasks.service";

type Props = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
};

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  Todo: { label: "Todo", color: "default" },
  InProgress: { label: "In Progress", color: "processing" },
  Done: { label: "Done", color: "success" },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  Low: { label: "Low", color: "default" },
  Medium: { label: "Medium", color: "warning" },
  High: { label: "High", color: "error" },
};

const fmt = (d?: string | null) => (d ? dayjs(d).format("MMM D, YYYY") : "—");

export default function ViewTaskModal({ open, taskId, onClose }: Props) {
  const {
    data: task,
    isLoading,
    isError,
    error,
  } = useQuery<Task | null>({
    queryKey: ["task", taskId],
    enabled: open && !!taskId,
    queryFn: () => getTaskById(taskId!),
  });

  useEffect(() => {
    if (open && isError) {
      console.error("getTaskById error:", error);
      toast.error((error as any)?.message ?? "Failed to load task");
    }
  }, [open, isError, error]);

  return (
 <Modal
  open={open}
  centered
  width={620}
  destroyOnHidden
  rootClassName="task-modal"
  title={<span className="task-modal__title">Task Details</span>}
  okText="Close"
  cancelButtonProps={{ style: { display: "none" } }}
  onOk={onClose}
  onCancel={onClose}
  styles={{
    mask: {
      background: "rgba(var(--bg-rgb), 0.72)",
      backdropFilter: "blur(6px)",
    },
    body: {
      padding: "16px 18px",
      background: "transparent",
    },
  }}
  style={{
    background: "var(--modal-surface)",
    border: "1px solid var(--panel-border)",
    borderRadius: 18,
    boxShadow: "var(--shadow-lg)",
    backdropFilter: `blur(var(--glass-blur))`,
  }}
  okButtonProps={{ className: "task-modal__ok" }}
>
      <p className="task-modal__subtitle">Review task info (read-only).</p>

      {isLoading ? (
        <div className="py-10 flex items-center justify-center">
          <Spin />
        </div>
      ) : !task ? (
        <div className="py-6 text-center">
          <div className="text-(--text) font-semibold">Task not found</div>
          <div className="text-(--muted) text-sm">It may have been deleted.</div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-(--text) text-lg font-semibold truncate">{task.title ?? "—"}</div>
         
            </div>

            <div className="flex gap-2 shrink-0">
              <Tag color={STATUS_META[(task.status ?? "Todo") as TaskStatus].color}>
                {STATUS_META[(task.status ?? "Todo") as TaskStatus].label}
              </Tag>
              <Tag color={PRIORITY_META[(task.priority ?? "Medium") as TaskPriority].color}>
                {PRIORITY_META[(task.priority ?? "Medium") as TaskPriority].label}
              </Tag>
            </div>
          </div>

          <Divider style={{ margin: "14px 0", borderColor: "var(--panel-border)" }} />

          <div className="space-y-3">
            <div>
              <div className="text-(--muted) text-xs mb-1">Description</div>
              <div className="text-(--text) whitespace-pre-wrap">
                {(task.description ?? "").trim() ? task.description : "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-(--muted) text-xs mb-1">Due date</div>
                <div className="text-(--text)">{fmt((task as any).dueDate ?? null)}</div>
              </div>

              <div>
                <div className="text-(--muted) text-xs mb-1">Last updated</div>
                <div className="text-(--text)">{fmt((task as any).updatedAt ?? null)}</div>
              </div>

              <div>
                <div className="text-(--muted) text-xs mb-1">Created</div>
                <div className="text-(--text)">{fmt((task as any).createdAt ?? null)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
