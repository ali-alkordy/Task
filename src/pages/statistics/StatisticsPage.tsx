// src/pages/Statistics/StatisticsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Select, Spin, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";

// ✅ Cloud Function (endpoint) service
import {
  getTaskStats,
  type StatsPeriod,
  type TaskStats,
} from "../../services/Tasks/tasksStats.service";

const { RangePicker } = DatePicker;

/** Support ISO string OR Firestore Timestamp-like objects coming from Functions JSON */
function toISO(v: any): string | null {
  if (!v) return null;

  // already string
  if (typeof v === "string") return v;

  // Firestore Timestamp-like: { seconds, nanoseconds } OR { _seconds, _nanoseconds }
  const sec =
    typeof v?.seconds === "number"
      ? v.seconds
      : typeof v?._seconds === "number"
        ? v._seconds
        : null;

  if (typeof sec === "number") return new Date(sec * 1000).toISOString();

  // Date object
  if (v instanceof Date) return v.toISOString();

  return null;
}

function formatDate(v: any, fmt = "YYYY-MM-DD") {
  const iso = toISO(v) ?? v;
  const d = dayjs(iso);
  return d.isValid() ? d.format(fmt) : "—";
}

const EMPTY_STATS: TaskStats = {
  total: 0,
  completionRate: 0,
  byStatus: { Todo: 0, InProgress: 0, Done: 0 },
  byPriority: { Low: 0, Medium: 0, High: 0 },
  withDue: 0,
  overdue: 0,
  dueToday: 0,
  dueNext7: 0,
  overdueTasks: [],
  dueSoonTasks: [],
};

export default function StatisticsPage() {
  const { user } = useAuth();
  const ownerUid = user?.uid;

  const [period, setPeriod] = useState<StatsPeriod>("30D");
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);

  const canRunCustom =
    period !== "CUSTOM" || (!!customRange[0] && !!customRange[1]);

  const {
    data: statsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<TaskStats>({
    queryKey: [
      "taskStats",
      ownerUid,
      period,
      customRange[0]?.toISOString() ?? "NONE",
      customRange[1]?.toISOString() ?? "NONE",
    ],
    enabled: !!ownerUid && canRunCustom,
    queryFn: () =>
      getTaskStats({
        period,
        // ✅ pass Dayjs (service converts to ISO)
        from: period === "CUSTOM" ? (customRange[0]?.startOf("day") ?? null) : null,
        to: period === "CUSTOM" ? (customRange[1]?.endOf("day") ?? null) : null,
        limit: 8,
      }),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isError) {
      // eslint-disable-next-line no-console
      console.error("taskStats error:", error);
      toast.error((error as any)?.message ?? "Failed to load statistics");
    }
  }, [isError, error]);

  // ✅ Always safe even if API returns partial object
  const stats: TaskStats = useMemo(() => {
    const d = (statsData ?? {}) as Partial<TaskStats>;

    return {
      ...EMPTY_STATS,
      ...d,

      byStatus: {
        ...EMPTY_STATS.byStatus,
        ...(d.byStatus ?? {}),
      },
      byPriority: {
        ...EMPTY_STATS.byPriority,
        ...(d.byPriority ?? {}),
      },

      overdueTasks: Array.isArray(d.overdueTasks) ? d.overdueTasks : [],
      dueSoonTasks: Array.isArray(d.dueSoonTasks) ? d.dueSoonTasks : [],
    };
  }, [statsData]);

  const periodLabel = useMemo(() => {
    if (period === "ALL") return "All time";
    if (period === "7D") return "Last 7 days";
    if (period === "30D") return "Last 30 days";
    if (period === "90D") return "Last 90 days";
    return "Custom";
  }, [period]);

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

  const dueColumns: ColumnsType<Task> = [
    {
      title: "Title",
      dataIndex: "title",
      render: (v: string, row) => (
        <div className="min-w-55">
          <div className="font-semibold text-(--text)">{v}</div>
          <div className="mt-1 text-xs text-(--muted) line-clamp-1">
            {row.description || "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 130,
      render: (v: TaskStatus) => statusTag(v),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      width: 130,
      render: (v: TaskPriority) => priorityTag(v),
    },
    {
      title: "Due",
      dataIndex: "dueDate",
      width: 150,
      render: (v?: any) => (
        <span className={v ? "text-(--text)" : "text-(--muted)"}>
          {formatDate(v)}
        </span>
      ),
    },
  ];

  const loading = isLoading || isFetching;

  const rangeValue =
    customRange[0] && customRange[1] ? ([customRange[0], customRange[1]] as [Dayjs, Dayjs]) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-(--text)">Statistics</h2>
          <p className="text-sm text-(--muted)">
            Quick insights about your tasks ({periodLabel}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={period}
            onChange={(v) => setPeriod(v)}
            style={{ width: 160 }}
            options={[
              { value: "30D", label: "Last 30 days" },
              { value: "7D", label: "Last 7 days" },
              { value: "90D", label: "Last 90 days" },
              { value: "ALL", label: "All time" },
              { value: "CUSTOM", label: "Custom range" },
            ]}
          />

          {period === "CUSTOM" && (
            <RangePicker
              value={rangeValue}
              onChange={(vals) =>
                setCustomRange([vals?.[0] ?? null, vals?.[1] ?? null])
              }
              allowClear
            />
          )}

          <Tooltip title="Refresh statistics">
            <Button
              onClick={() => refetch()}
              icon={<RefreshCw size={16} />}
              className="bg-(--panel) text-(--text) border border-(--panel-border)"
              disabled={!ownerUid || (period === "CUSTOM" && !canRunCustom)}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Spin />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
              <div className="text-sm text-(--muted)">Total tasks</div>
              <div className="mt-1 text-2xl font-semibold text-(--text)">
                {stats.total}
              </div>
              <div className="mt-2 text-xs text-(--muted)">In selected period</div>
            </div>

            <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
              <div className="text-sm text-(--muted)">Completion rate</div>
              <div className="mt-1 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <div className="text-2xl font-semibold text-(--text)">
                  {stats.completionRate}%
                </div>
              </div>
              <div className="mt-2 text-xs text-(--muted)">Done / Total</div>
            </div>

            <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
              <div className="text-sm text-(--muted)">Overdue</div>
              <div className="mt-1 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                <div className="text-2xl font-semibold text-(--text)">
                  {stats.overdue}
                </div>
              </div>
              <div className="mt-2 text-xs text-(--muted)">
                Not done + due date passed
              </div>
            </div>

            <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
              <div className="text-sm text-(--muted)">Due soon</div>
              <div className="mt-1 text-2xl font-semibold text-(--text)">
                {stats.dueToday + stats.dueNext7}
              </div>
              <div className="mt-2 text-xs text-(--muted)">
                Today: {stats.dueToday} • Next 7 days: {stats.dueNext7}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
          <div className="text-(--text) font-semibold mb-3">Status breakdown</div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">Todo</span>
              <span className="text-sm text-(--text) font-semibold">
                {stats.byStatus.Todo}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">In Progress</span>
              <span className="text-sm text-(--text) font-semibold">
                {stats.byStatus.InProgress}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">Done</span>
              <span className="text-sm text-(--text) font-semibold">
                {stats.byStatus.Done}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-4">
          <div className="text-(--text) font-semibold mb-3">Priority breakdown</div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">High</span>
              <span className="text-sm text-(--text) font-semibold">
                {stats.byPriority.High}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">Medium</span>
              <span className="text-sm text-(--text) font-semibold">
                {stats.byPriority.Medium}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">Low</span>
              <span className="text-sm text-(--text) font-semibold">
                {stats.byPriority.Low}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-(--text) font-semibold">Overdue tasks</div>
            <div className="text-xs text-(--muted)">
              Top {stats.overdueTasks.length}
            </div>
          </div>

          <Table<Task>
            rowKey="id"
            columns={dueColumns}
            dataSource={stats.overdueTasks}
            pagination={false}
            size="small"
            locale={{
              emptyText: (
                <div className="py-6 text-(--muted) text-center">
                  No overdue tasks 🎉
                </div>
              ),
            }}
          />
        </div>

        <div className="rounded-xl border border-(--panel-border) bg-(--panel) p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-(--text) font-semibold">Due soon</div>
            <div className="text-xs text-(--muted)">
              Top {stats.dueSoonTasks.length}
            </div>
          </div>

          <Table<Task>
            rowKey="id"
            columns={dueColumns}
            dataSource={stats.dueSoonTasks}
            pagination={false}
            size="small"
            locale={{
              emptyText: (
                <div className="py-6 text-(--muted) text-center">
                  No upcoming due tasks
                </div>
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
}
