import { useEffect } from "react";
import { DatePicker, Form, Input, Modal, Select, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "../../../utils/toast";
import type { Task, TaskPriority, TaskStatus } from "../../../types/task";
import { getTaskById, updateTask } from "../../../services/Tasks/tasks.service";

type EditTaskFormValues = {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Dayjs | null;
};

type Props = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
};

export default function EditTaskModal({ open, taskId, onClose }: Props) {
  const [form] = Form.useForm<EditTaskFormValues>();
  const qc = useQueryClient();

  const {
    data: task,
    isLoading: isTaskLoading,
    isError,
    error,
  } = useQuery<Task | null>({
    queryKey: ["task", taskId],
    enabled: open && !!taskId,
    queryFn: () => getTaskById(taskId!),
  });

  const updateMut = useMutation({
    mutationFn: async (values: EditTaskFormValues) => {
      if (!taskId) throw new Error("Missing task id");

      return updateTask(taskId, {
        title: values.title.trim(),
        description: (values.description ?? "").trim(),
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate ? values.dueDate.format("YYYY-MM-DD") : null,
      });
    },
    onSuccess: async () => {
      toast.success("Task updated ✅");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      if (taskId) await qc.invalidateQueries({ queryKey: ["task", taskId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update task"),
  });

  // ✅ same style as Add: prepare form values when modal opens / data changes
useEffect(() => {
  if (!open || !task) return;

  form.setFieldsValue({
    title: task.title ?? "",
    description: task.description ?? "",
    status: (task.status ?? "Todo") as TaskStatus,
    priority: (task.priority ?? "Medium") as TaskPriority,
    dueDate: task.dueDate ? dayjs(task.dueDate) : null,
  });
}, [open, task, form]);

  // show error toast same as before
  useEffect(() => {
    if (open && isError) {
      console.error("getTaskById error:", error);
      toast.error((error as any)?.message ?? "Failed to load task");
    }
  }, [open, isError, error]);
useEffect(() => {
  if (open) return;
  form.resetFields();
}, [open, form]);
  return (
   <Modal
  open={open}
  centered
  width={620}
  destroyOnHidden
  rootClassName="task-modal"
  title={<span className="task-modal__title">Edit Task</span>}
  okText="Save"
  cancelText="Cancel"
  confirmLoading={updateMut.isPending}
  onOk={() => form.submit()}
  onCancel={() => {
    if (!updateMut.isPending) onClose();
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
    className: "task-modal__ok",
    disabled: isTaskLoading || !task,
  }}
  cancelButtonProps={{
    className: "task-modal__cancel",
  }}
>

      <p className="task-modal__subtitle">Update the task details and save changes.</p>

      {isTaskLoading ? (
        <div className="py-10 flex items-center justify-center">
          <Spin />
        </div>
      ) : !task ? (
        <div className="py-6 text-center">
          <div className="text-(--text) font-semibold">Task not found</div>
          <div className="text-(--muted) text-sm">It may have been deleted.</div>
        </div>
      ) : (
        <Form<EditTaskFormValues>
          form={form}
          layout="vertical"
          initialValues={{ status: "Todo", priority: "Medium", dueDate: null }}
          onFinish={(values) => updateMut.mutate(values)}
        >
          <Form.Item
            label={<span className="task-modal__label">Title</span>}
            name="title"
            rules={[
              { required: true, message: "Title is required" },
              { min: 2, message: "Title must be at least 2 characters" },
            ]}
          >
            <Input placeholder="e.g. Finish report" maxLength={120} />
          </Form.Item>

          <Form.Item label={<span className="task-modal__label">Description</span>} name="description">
            <Input.TextArea placeholder="Optional..." autoSize={{ minRows: 3, maxRows: 6 }} />
          </Form.Item>

          <div className="task-modal__grid">
            <Form.Item
              label={<span className="task-modal__label">Status</span>}
              name="status"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "Todo", label: "Todo" },
                  { value: "InProgress", label: "In Progress" },
                  { value: "Done", label: "Done" },
                ]}
              />
            </Form.Item>

            <Form.Item
              label={<span className="task-modal__label">Priority</span>}
              name="priority"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "Low", label: "Low" },
                  { value: "Medium", label: "Medium" },
                  { value: "High", label: "High" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label={<span className="task-modal__label">Due date</span>} name="dueDate">
       <DatePicker
  className="w-full"
  placeholder="Select date (optional)"
  classNames={{ popup: { root: "task-date-popup" } }}
  allowClear
/>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
