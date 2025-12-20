// src/pages/Tasks/components/DeleteTaskModal.tsx
import dayjs from "dayjs";
import { Modal, Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "../../../utils/toast";
import type { Task } from "../../../types/task";
import { getTaskById, softDeleteTask } from "../../../services/Tasks/tasks.service";

type Props = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
};

export default function DeleteTaskModal({ open, taskId, onClose }: Props) {
  const qc = useQueryClient();

  const {
    data: task,
    isLoading: isTaskLoading,
    isError,
    error,
  } = useQuery<Task | null>({
    queryKey: ["task", taskId],
    enabled: open && !!taskId,
    queryFn: async () => {
      const res: any = await getTaskById(taskId!);
      return res?.data ?? res ?? null;
    },
    retry: 1,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await softDeleteTask(id);
      return res?.data ?? res;
    },
    onSuccess: async () => {
      toast.success("Task deleted");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      if (taskId) await qc.invalidateQueries({ queryKey: ["task", taskId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const isDeleting = (deleteMut as any).isPending ?? (deleteMut as any).isLoading;

  return (
    <Modal
  open={open}
  centered
  width={620}
  destroyOnHidden
  rootClassName="task-modal"
  title={<span className="task-modal__title">Delete Task</span>}
  okText="Delete"
  cancelText="Cancel"
  confirmLoading={isDeleting}
  onOk={() => {
    if (!taskId) return;
    deleteMut.mutate(taskId);
  }}
  onCancel={() => {
    if (!isDeleting) onClose();
  }}
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
  okButtonProps={{
    danger: true,
    className: "task-modal__ok",
    disabled: isTaskLoading || !taskId,
  }}
  cancelButtonProps={{
    className: "task-modal__cancel",
    disabled: isDeleting,
  }}
>

      <p className="task-modal__subtitle">
        This will <span className="font-semibold text-(--text)">soft-delete</span> the task.
      </p>

      {!taskId ? (
        <div className="py-6 text-center">
          <div className="text-(--text) font-semibold">No task selected</div>
          <div className="text-(--muted) text-sm">Close and try again.</div>
        </div>
      ) : isTaskLoading ? (
        <div className="py-10 flex items-center justify-center">
          <Spin />
        </div>
      ) : isError ? (
        <div className="space-y-2">
          <div className="font-semibold text-(--text)">Couldn’t load task</div>
          <div className="text-sm text-(--muted)">{(error as any)?.message ?? "Unknown error"}</div>
          <div className="text-sm text-(--muted)">You can still delete it if you want.</div>
        </div>
      ) : !task ? (
        <div className="py-6 text-center">
          <div className="text-(--text) font-semibold">Task not found</div>
          <div className="text-(--muted) text-sm">It may have been deleted already.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-3">
            <div className="text-(--text) font-semibold">{task.title ?? "Untitled"}</div>

            {task.description ? (
              <div className="mt-1 text-sm text-(--muted)">{task.description}</div>
            ) : (
              <div className="mt-1 text-sm text-(--muted)">No description</div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-(--muted)">
              <span>Due: {task.dueDate ? dayjs(task.dueDate).format("YYYY-MM-DD") : "—"}</span>
              <span>Priority: {task.priority ?? "—"}</span>
              <span>Status: {task.status ?? "—"}</span>
              {task.updatedAt ? <span>Updated: {dayjs(task.updatedAt).format("YYYY-MM-DD HH:mm")}</span> : null}
            </div>
          </div>

          <div className="rounded-xl border border-(--danger-border) bg-(--danger-bg) p-3">
            <div className="text-sm font-semibold" style={{ color: "var(--danger-text)" }}>
              Warning
            </div>
            <div className="text-sm text-(--muted) mt-1">
              This action removes the task from your list. Restore is only possible if your backend supports it.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
