import React, { useEffect } from "react";
import { DatePicker, Form, Input, Modal, Select } from "antd";
import type { Dayjs } from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { toast } from "../../../utils/toast";
import type { TaskPriority, TaskStatus } from "../../../types/task";
import { createTask } from "../../../services/Tasks/tasks.service";

type AddTaskFormValues = {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Dayjs | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddTaskModal({ open, onClose }: Props) {
  const [form] = Form.useForm<AddTaskFormValues>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: async (values: AddTaskFormValues) => {
      if (!user?.uid) throw new Error("Not authenticated");

      return createTask({
        ownerUid: user.uid,
        title: values.title.trim(),
        description: (values.description ?? "").trim(),
        status: values.status,
        priority: values.priority,
        // Keep same style you used in Firestore console
        dueDate: values.dueDate ? values.dueDate.format("YYYY-MM-DD") : null,
      });
    },
    onSuccess: () => {
      toast.success("Task created ✅");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      form.resetFields();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create task"),
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium",
      dueDate: null,
    });
  }, [open, form]);

  return (
    <Modal
      open={open}
      centered
      width={620}
      destroyOnClose
      rootClassName="task-modal" // ✅ for scoped CSS
      title={<span className="task-modal__title">Add Task</span>}
      okText="Create"
      cancelText="Cancel"
      confirmLoading={createMut.isPending}
      onOk={() => form.submit()}
      onCancel={() => {
        if (!createMut.isPending) onClose();
      }}
      // ✅ make overlay darker + slight blur (background only)
      maskStyle={{
        background: "rgba(var(--bg-rgb), 0.72)",
        backdropFilter: "blur(6px)",
      }}
      styles={{
        // ✅ IMPORTANT: use panel-elevated (more solid) + strong shadow
        content: {
          background: "var(--panel-elevated)",
          border: "1px solid var(--panel-border)",
          borderRadius: 18,
          boxShadow: "var(--shadow-lg)",
          backdropFilter: "none",
        },
        header: {
          background: "transparent",
          borderBottom: "1px solid var(--panel-border)",
          padding: "14px 18px",
        },
        body: {
          padding: "16px 18px",
        },
        footer: {
          borderTop: "1px solid var(--panel-border)",
          padding: "12px 18px",
        },
      }}
      okButtonProps={{
        className: "task-modal__ok",
      }}
      cancelButtonProps={{
        className: "task-modal__cancel",
      }}
    >
      <p className="task-modal__subtitle">
        Create a new task with status, priority and an optional due date.
      </p>

      <Form<AddTaskFormValues>
        form={form}
        layout="vertical"
        initialValues={{ status: "Todo", priority: "Medium", dueDate: null }}
        onFinish={(values) => createMut.mutate(values)}
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
          <Form.Item label={<span className="task-modal__label">Status</span>} name="status" rules={[{ required: true }]}>
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
          <DatePicker className="w-full" placeholder="Select date (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
