// src/pages/Tasks/TasksPage.tsx
import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";

import { Button, DatePicker, Input, Select, Space, Table, Tag, Tooltip, Grid } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";

import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";
import { bulkMarkDone, listTasks } from "../../services/Tasks/tasks.service";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2, CheckCircle2 } from "lucide-react";

import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";
import ViewTaskModal from "./components/ViewTaskModal";
import DeleteTaskModal from "./components/DeleteTaskModal";

const { RangePicker } = DatePicker;

type SortField = "createdAt" | "updatedAt" | "dueDate" | "title" | "priority" | "status";

type PagedResult<T> = {
  items: T[];
  total: number;
};

export default function TasksPage() {
  const { user, hydrated } = useAuth();
  const qc = useQueryClient();

  // ✅ detect mobile (AntD breakpoints)
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const [createOpen, setCreateOpen] = useState(false);

  // ✅ View modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  // ✅ Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ✅ Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ✅ Search on submit (not on change)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // applied search (used by query)

  // ✅ Draft filters (UI changes won't fetch)
  const [statusInput, setStatusInput] = useState<TaskStatus | "All">("All");
  const [priorityInput, setPriorityInput] = useState<TaskPriority | "All">("All");
  const [dueRangeInput, setDueRangeInput] = useState<[string | null, string | null]>([null, null]);

  // ✅ Applied filters (only these affect query)
  const [statusApplied, setStatusApplied] = useState<TaskStatus | "All">("All");
  const [priorityApplied, setPriorityApplied] = useState<TaskPriority | "All">("All");
  const [dueRangeApplied, setDueRangeApplied] = useState<[string | null, string | null]>([null, null]);

  // ✅ Controlled sorter state (server-side)
  const DEFAULT_SORT_FIELD: SortField = "updatedAt";
  const DEFAULT_SORT_ORDER: "ascend" | "descend" = "descend";

  const [sortField, setSortField] = useState<SortField>(DEFAULT_SORT_FIELD);
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend">(DEFAULT_SORT_ORDER);

  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  // ✅ Normalize filters BEFORE query + key (USING APPLIED FILTERS)
  const statusFilter: TaskStatus | undefined = statusApplied === "All" ? undefined : statusApplied;
  const priorityFilter: TaskPriority | undefined = priorityApplied === "All" ? undefined : priorityApplied;

  const dueFrom = dueRangeApplied[0] ?? undefined;
  const dueTo = dueRangeApplied[1] ?? undefined;

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
    setStatusApplied(statusInput);
    setPriorityApplied(priorityInput);
    setDueRangeApplied(dueRangeInput);
  };

  const queryKey = useMemo(
    () =>
      [
        "tasks",
        user?.uid ?? "anon",
        page,
        pageSize,
        search,
        statusFilter ?? "ALL",
        priorityFilter ?? "ALL",
        dueFrom ?? "NONE",
        dueTo ?? "NONE",
        sortField,
        sortOrder,
      ] as const,
    [user?.uid, page, pageSize, search, statusFilter, priorityFilter, dueFrom, dueTo, sortField, sortOrder]
  );

  const { data, isLoading, isFetching, isError, error } = useQuery<PagedResult<Task>>({
    queryKey,
    enabled: hydrated && !!user?.uid,
    queryFn: () =>
      listTasks({
        page,
        pageSize,
        search,
        status: statusFilter,
        priority: priorityFilter,
        dueFrom,
        dueTo,
        sortField,
        sortOrder,
      }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (isError) {
      console.error("listTasks error:", error);
      toast.error((error as any)?.message ?? "Failed to load tasks");
    }
  }, [isError, error]);

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
    const v = map[s ?? "Todo"];
    return <Tag color={v.color}>{v.label}</Tag>;
  };

  const priorityTag = (p: TaskPriority) => {
    const map: Record<TaskPriority, { label: string; color: string }> = {
      Low: { label: "Low", color: "default" },
      Medium: { label: "Medium", color: "warning" },
      High: { label: "High", color: "error" },
    };
    const v = map[p ?? "Medium"];
    return <Tag color={v.color}>{v.label}</Tag>;
  };

  const openView = (id: string) => {
    setViewId(id);
    setViewOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setEditOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  // ✅ Helper to bind AntD UI sort indicators to our state
  const colSortOrder = (field: SortField) => (sortField === field ? sortOrder : null);

  const columns = useMemo<ColumnsType<Task>>(
    () => [
      {
        title: "Title",
        dataIndex: "title",
        sorter: true,
        sortOrder: colSortOrder("title"),
        render: (v: string, row) => (
          <div className="min-w-0">
            <div className="font-semibold text-(--text) truncate">{v}</div>
            {row.description ? (
              <div className="mt-1 line-clamp-1 text-xs text-(--muted)">{row.description}</div>
            ) : (
              <div className="mt-1 text-xs text-(--muted)">No description</div>
            )}
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        sorter: true,
        sortOrder: colSortOrder("status"),
        width: 140,
        render: (v: TaskStatus) => statusTag(v),
      },
      {
        title: "Priority",
        dataIndex: "priority",
        sorter: true,
        sortOrder: colSortOrder("priority"),
        width: 140,
        render: (v: TaskPriority) => priorityTag(v),
      },
      {
        title: "Due",
        dataIndex: "dueDate",
        sorter: true,
        sortOrder: colSortOrder("dueDate"),
        width: 160,
        render: (v?: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : <span className="text-(--muted)">—</span>),
      },
      {
        title: "Updated",
        dataIndex: "updatedAt",
        sorter: true,
        sortOrder: colSortOrder("updatedAt"),
        width: 180,
        render: (v: any) => <span className="text-(--muted)">{v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"}</span>,
      },
      {
        title: "Actions",
        key: "actions",
        width: isMobile ? 140 : 170,
        render: (_, row) => (
          <Space>
            <Tooltip title="View">
              <Button size="small" onClick={() => openView(row.id)} icon={<Eye size={16} />} />
            </Tooltip>

            <Tooltip title="Edit">
              <Button size="small" onClick={() => openEdit(row.id)} icon={<Pencil size={16} />} />
            </Tooltip>

            <Tooltip title="Delete">
              <Button size="small" danger onClick={() => openDelete(row.id)} icon={<Trash2 size={16} />} />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [sortField, sortOrder, isMobile]
  );

  const onTableChange = (p: TablePaginationConfig, _filters: any, sorter: SorterResult<Task> | SorterResult<Task>[]) => {
    // ✅ pagination (server-side)
    setPage(p.current ?? 1);
    setPageSize(p.pageSize ?? 10);

    // ✅ sorting (server-side)
    const s = Array.isArray(sorter) ? sorter[0] : sorter;

    // When user sorts: s.field + s.order exist
    if (s?.field && s?.order) {
      setSortField(s.field as SortField);
      setSortOrder(s.order as any);
      setPage(1);
      return;
    }

    // When user clears sort
    if (s?.field && !s.order) {
      setSortField(DEFAULT_SORT_FIELD);
      setSortOrder(DEFAULT_SORT_ORDER);
      setPage(1);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-(--text)">Tasks</h2>
          <p className="text-sm text-(--muted)">Manage your tasks with search, filters, sorting and bulk actions.</p>
        </div>

        {/* ✅ buttons stack on mobile */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button className="w-full sm:w-auto" type="primary" onClick={() => setCreateOpen(true)}>
            + New Task
          </Button>

          <Button
            className="w-full sm:w-auto"
            disabled={selectedRowKeys.length === 0}
            onClick={() => bulkDoneMut.mutate(selectedRowKeys as string[])}
            icon={<CheckCircle2 size={16} />}
          >
            Mark Done
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {/* ✅ responsive grid for filters */}
          <div className="grid w-full flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Input
                allowClear
                placeholder="Search title/description..."
                value={searchInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchInput(v);

                  // ✅ if user clears using X -> clear applied search too
                  if (!v) {
                    setPage(1);
                    setSearch("");
                  }
                }}
                onPressEnter={applySearch}
                className="w-full"
              />
            </div>

            <div className="lg:col-span-1">
              <Select
                value={statusInput}
                onChange={(v) => setStatusInput(v)}
                style={{ width: "100%" }}
                options={[
                  { value: "All", label: "All Status" },
                  { value: "Todo", label: "Todo" },
                  { value: "InProgress", label: "In Progress" },
                  { value: "Done", label: "Done" },
                ]}
              />
            </div>

            <div className="lg:col-span-1">
              <Select
                value={priorityInput}
                onChange={(v) => setPriorityInput(v)}
                style={{ width: "100%" }}
                options={[
                  { value: "All", label: "All Priority" },
                  { value: "Low", label: "Low" },
                  { value: "Medium", label: "Medium" },
                  { value: "High", label: "High" },
                ]}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <RangePicker
                className="w-full"
                value={[
                  dueRangeInput[0] ? dayjs(dueRangeInput[0]) : null,
                  dueRangeInput[1] ? dayjs(dueRangeInput[1]) : null,
                ]}
                onChange={(vals) => {
                  if (!vals || vals.length !== 2) return setDueRangeInput([null, null]);
                  setDueRangeInput([
                    vals[0] ? vals[0].startOf("day").toISOString() : null,
                    vals[1] ? vals[1].endOf("day").toISOString() : null,
                  ]);
                }}
              />
            </div>
          </div>

          {/* ✅ buttons full width on mobile */}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto">
            <Button className="w-full sm:w-auto" type="primary" onClick={applySearch}>
              Search
            </Button>

            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setSearchInput("");
                setSearch("");

                setStatusInput("All");
                setPriorityInput("All");
                setDueRangeInput([null, null]);

                setStatusApplied("All");
                setPriorityApplied("All");
                setDueRangeApplied([null, null]);

                setSortField(DEFAULT_SORT_FIELD);
                setSortOrder(DEFAULT_SORT_ORDER);

                setPage(1);
                setSelectedRowKeys([]);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-2">
        <Table<Task>
          rowKey="id"
          size={isMobile ? "small" : "middle"}
          scroll={{ x: "max-content" }} // ✅ allow horizontal scroll on small screens
          loading={isLoading || isFetching}
          columns={columns}
          dataSource={items}
          onChange={onTableChange}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            placement: ["bottomCenter"],
            simple: isMobile, // ✅ mobile-friendly pagination
            showTotal: isMobile
              ? undefined
              : (t, range) => (
                  <span className="text-(--muted) text-sm">
                    {range[0]}-{range[1]} of {t}
                  </span>
                ),
          }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="text-(--text) font-semibold">No tasks found</div>
                <div className="text-(--muted) text-sm">Try reset filters or add new tasks.</div>
              </div>
            ),
          }}
        />
      </div>

      {/* ✅ Create Task Modal */}
      <AddTaskModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* ✅ View Task Modal */}
      <ViewTaskModal
        open={viewOpen}
        taskId={viewId}
        onClose={() => {
          setViewOpen(false);
          setViewId(null);
        }}
      />

      {/* ✅ Edit Task Modal */}
      <EditTaskModal
        open={editOpen}
        taskId={editId}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
        }}
      />

      {/* ✅ Delete Task Modal */}
      <DeleteTaskModal
        open={deleteOpen}
        taskId={deleteId}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
