import { useMemo, useState } from "react";
import type { Key } from "react";

import {
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";

import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";

// ✅ remove ".ts" from import path
import {
  bulkMarkDone,
  listTasks,
  softDeleteTask,
} from "../../services/Tasks/tasks.service";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { Eye, Pencil, Trash2, CheckCircle2 } from "lucide-react";

const { RangePicker } = DatePicker;

type SortField = "createdAt" | "updatedAt" | "dueDate" | "title" | "priority" | "status";

type PagedResult<T> = {
  items: T[];
  total: number;
};

export default function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "All">("All");
  const [priority, setPriority] = useState<TaskPriority | "All">("All");
  const [dueRange, setDueRange] = useState<[string | null, string | null]>([null, null]);

  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend">("descend");

  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const ownerUid = user?.uid;

  const queryKey = useMemo(
    () => ["tasks", ownerUid, page, pageSize, search, status, priority, dueRange, sortField, sortOrder] as const,
    [ownerUid, page, pageSize, search, status, priority, dueRange, sortField, sortOrder]
  );

  const { data, isLoading, isFetching } = useQuery<PagedResult<Task>>({
    queryKey,
    enabled: !!ownerUid,
    queryFn: () =>
      listTasks({
        ownerUid: ownerUid!,
        page,
        pageSize,
        search,
        status,
        priority,
        dueFrom: dueRange[0] ?? undefined,
        dueTo: dueRange[1] ?? undefined,
        sortField,
        sortOrder,
      }),
    // ✅ v5 replacement for keepPreviousData: true
    placeholderData: keepPreviousData,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => softDeleteTask(id),
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedRowKeys([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const bulkDoneMut = useMutation({
    mutationFn: (ids: string[]) => bulkMarkDone(ids),
    onSuccess: () => {
      toast.success("Marked as Done ✅");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedRowKeys([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Bulk update failed"),
  });

  const statusTag = (s: TaskStatus) => {
    const map: Record<TaskStatus, { label: string; color: string }> = {
      Todo: { label: "Todo", color: "default" },
      InProgress: { label: "In Progress", color: "processing" },
      Done: { label: "Done", color: "success" },
    };
    const v = map[s];
    return <Tag color={v.color}>{v.label}</Tag>;
  };

  const priorityTag = (p: TaskPriority) => {
    const map: Record<TaskPriority, { label: string; color: string }> = {
      Low: { label: "Low", color: "default" },
      Medium: { label: "Medium", color: "warning" },
      High: { label: "High", color: "error" },
    };
    const v = map[p];
    return <Tag color={v.color}>{v.label}</Tag>;
  };

  const columns: ColumnsType<Task> = [
    {
      title: "Title",
      dataIndex: "title",
      sorter: true,
      render: (v: string, row) => (
        <div className="min-w-[220px]">
          <div className="font-semibold text-white">{v}</div>
          {row.description ? (
            <div className="mt-1 line-clamp-1 text-xs text-white/60">
              {row.description}
            </div>
          ) : (
            <div className="mt-1 text-xs text-white/40">No description</div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      sorter: true,
      width: 140,
      render: (v: TaskStatus) => statusTag(v),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      sorter: true,
      width: 140,
      render: (v: TaskPriority) => priorityTag(v),
    },
    {
      title: "Due",
      dataIndex: "dueDate",
      sorter: true,
      width: 160,
      render: (v?: string | null) =>
        v ? dayjs(v).format("YYYY-MM-DD") : <span className="text-white/40">—</span>,
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      sorter: true,
      width: 180,
      render: (v: string) => (
        <span className="text-white/70">{dayjs(v).format("YYYY-MM-DD HH:mm")}</span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 170,
      render: (_, row) => (
        <Space>
          <Tooltip title="View">
            <Button size="small" onClick={() => toast.info(`View: ${row.title}`)} icon={<Eye size={16} />} />
          </Tooltip>

          <Tooltip title="Edit (demo)">
            <Button size="small" onClick={() => toast.info("Next: open edit modal")} icon={<Pencil size={16} />} />
          </Tooltip>

          <Tooltip title="Delete">
            <Button
              size="small"
              danger
              onClick={() => {
                Modal.confirm({
                  title: "Delete task?",
                  content: "This will soft-delete the task.",
                  okText: "Delete",
                  okButtonProps: { danger: true },
                  onOk: () => deleteMut.mutate(row.id),
                });
              }}
              icon={<Trash2 size={16} />}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const onTableChange = (
    p: TablePaginationConfig,
    _filters: any,
    sorter: SorterResult<Task> | SorterResult<Task>[]
  ) => {
    setPage(p.current ?? 1);
    setPageSize(p.pageSize ?? 10);

    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s?.field && s?.order) {
      setSortField(s.field as SortField);
      setSortOrder(s.order as any);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Tasks</h2>
          <p className="text-sm text-white/60">
            Manage your tasks with search, filters, sorting and bulk actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="primary"
            className="!bg-[color:var(--primary)] hover:!bg-[color:var(--primary-hover)]"
            onClick={() => toast.info("Next: open create task modal")}
          >
            + New Task
          </Button>

          <Button
            disabled={selectedRowKeys.length === 0}
            onClick={() => bulkDoneMut.mutate(selectedRowKeys as string[])}
            icon={<CheckCircle2 size={16} />}
          >
            Mark Done
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Input
              allowClear
              placeholder="Search title/description..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="max-w-[320px]"
            />

            <Select
              value={status}
              onChange={(v) => {
                setPage(1);
                setStatus(v);
              }}
              style={{ width: 160 }}
              options={[
                { value: "All", label: "All Status" },
                { value: "Todo", label: "Todo" },
                { value: "InProgress", label: "In Progress" },
                { value: "Done", label: "Done" },
              ]}
            />

            <Select
              value={priority}
              onChange={(v) => {
                setPage(1);
                setPriority(v);
              }}
              style={{ width: 170 }}
              options={[
                { value: "All", label: "All Priority" },
                { value: "Low", label: "Low" },
                { value: "Medium", label: "Medium" },
                { value: "High", label: "High" },
              ]}
            />

            <RangePicker
              onChange={(vals) => {
                setPage(1);
                if (!vals || vals.length !== 2) return setDueRange([null, null]);
                setDueRange([
                  vals[0] ? vals[0].startOf("day").toISOString() : null,
                  vals[1] ? vals[1].endOf("day").toISOString() : null,
                ]);
              }}
            />
          </div>

          <Button
            onClick={() => {
              setSearch("");
              setStatus("All");
              setPriority("All");
              setDueRange([null, null]);
              setSortField("updatedAt");
              setSortOrder("descend");
              setPage(1);
              setSelectedRowKeys([]);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-2">
        <Table<Task>
          rowKey="id"
          loading={isLoading || isFetching}
          columns={columns}
          dataSource={items}
          onChange={onTableChange}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
        />
      </div>
    </div>
  );
}
