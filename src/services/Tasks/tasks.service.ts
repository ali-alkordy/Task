import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from './../../api/firebase';
import type { Task, TaskPriority, TaskStatus } from "./../../types/task";

export type TasksQuery = {
  ownerUid: string;

  page: number;      // 1-based
  pageSize: number;

  sortField?: "createdAt" | "updatedAt" | "dueDate" | "title" | "priority" | "status";
  sortOrder?: "ascend" | "descend";

  search?: string;

  status?: TaskStatus | "All";
  priority?: TaskPriority | "All";

  dueFrom?: string; // ISO
  dueTo?: string;   // ISO
};

export type PagedResult<T> = {
  items: T[];
  total: number;
};

function tsToIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return new Date().toISOString();
}

function normalizeTask(id: string, data: any): Task {
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    status: (data.status ?? "Todo") as TaskStatus,
    priority: (data.priority ?? "Medium") as TaskPriority,
    dueDate: data.dueDate ? tsToIso(data.dueDate) : null,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    ownerUid: data.ownerUid,
    isDeleted: !!data.isDeleted,
  };
}

export async function listTasks(qp: TasksQuery): Promise<PagedResult<Task>> {
  // Firestore doesn’t support full SQL-like server paging + count easily without extra setup.
  // For this mini product: we’ll do a “good enough” server-ish approach:
  // - Filter by owner + isDeleted
  // - Apply status/priority filters on query when possible
  // - Sort on server (orderBy)
  // - Fetch a larger chunk and filter/search/date-range on client
  // - Then slice for pagination

  const base = collection(db, "tasks");

  const constraints: QueryConstraint[] = [
    where("ownerUid", "==", qp.ownerUid),
    where("isDeleted", "==", false),
  ];

  if (qp.status && qp.status !== "All") constraints.push(where("status", "==", qp.status));
  if (qp.priority && qp.priority !== "All") constraints.push(where("priority", "==", qp.priority));

  const sortField = qp.sortField ?? "updatedAt";
  const sortOrder = qp.sortOrder ?? "descend";
  constraints.push(orderBy(sortField, sortOrder === "ascend" ? "asc" : "desc"));

  // Fetch more than one page to allow client search/date filtering
  const fetchSize = Math.min(200, qp.pageSize * 6);
  constraints.push(limit(fetchSize));

  const snap = await getDocs(query(base, ...constraints));
  let items = snap.docs.map((d) => normalizeTask(d.id, d.data()));

  // Search (title/description contains)
  const s = (qp.search ?? "").trim().toLowerCase();
  if (s) {
    items = items.filter((t) => {
      const hay = `${t.title} ${t.description ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }

  // Due date range
  if (qp.dueFrom || qp.dueTo) {
    const from = qp.dueFrom ? new Date(qp.dueFrom).getTime() : Number.NEGATIVE_INFINITY;
    const to = qp.dueTo ? new Date(qp.dueTo).getTime() : Number.POSITIVE_INFINITY;

    items = items.filter((t) => {
      if (!t.dueDate) return false;
      const ms = new Date(t.dueDate).getTime();
      return ms >= from && ms <= to;
    });
  }

  const total = items.length;

  const start = (qp.page - 1) * qp.pageSize;
  const end = start + qp.pageSize;
  const pageItems = items.slice(start, end);

  return { items: pageItems, total };
}

export async function getTaskById(id: string): Promise<Task | null> {
  const ref = doc(db, "tasks", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeTask(snap.id, snap.data());
}

export async function createTask(payload: Partial<Task> & { ownerUid: string }): Promise<string> {
  const ref = await addDoc(collection(db, "tasks"), {
    title: payload.title ?? "",
    description: payload.description ?? "",
    status: payload.status ?? "Todo",
    priority: payload.priority ?? "Medium",
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    ownerUid: payload.ownerUid,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate ? new Date(patch.dueDate) : null } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteTask(id: string): Promise<void> {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, { isDeleted: true, updatedAt: serverTimestamp() });
}

export async function bulkMarkDone(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => updateTask(id, { status: "Done" })));
}
