import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";
import * as jwt from "jsonwebtoken";

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

// Secrets
const TASKS_WEB_API_KEY = defineSecret("TASKS_WEB_API_KEY");
const TASKS_JWT_SECRET = defineSecret("TASKS_JWT_SECRET");

// Regions
const REGION_MAIN = "us-central1" as const;
const REGION_WRITE = "us-east1" as const;

// Base settings (low resources to avoid quotas)
const BASE_OPTS = {
  region: REGION_MAIN,
  minInstances: 0,
  maxInstances: 1,
  memory: "256MiB" as const,
  timeoutSeconds: 30,
  cpu: "gcf_gen1" as const,
  concurrency: 1,
};
const WRITE_OPTS = { ...BASE_OPTS, region: REGION_WRITE };

/** =========================
 * Helpers
 * ========================= */
function setCors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.setHeader("Access-Control-Max-Age", "3600");
}

function handlePreflight(req: Request, res: Response) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

function sendJson(res: Response, code: number, payload: any) {
  setCors(res);
  res.status(code).json(payload);
}

function sendError(res: Response, code: number, message: string) {
  setCors(res);
  res.status(code).json({ message });
}

function toISO(v: any): string | null {
  if (!v) return null;
  if (v instanceof admin.firestore.Timestamp) return v.toDate().toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000).toISOString();
  if (typeof v === "string") return v;
  return null;
}

function normalizeTaskOut(t: any) {
  return {
    ...t,
    createdAt: toISO(t.createdAt),
    updatedAt: toISO(t.updatedAt),
    dueDate: toISO(t.dueDate),
    deletedAt: toISO(t.deletedAt),
  };
}

function isSoftDeleted(t: any) {
  return !!t?.isDeleted || !!t?.deletedAt;
}

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function tokenize(s: any): string[] {
  const text = norm(s);
  const matches = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

function buildSearchTokens(title: any, description: any): string[] {
  return tokenize(`${title ?? ""} ${description ?? ""}`).slice(0, 50);
}

function statusRankOf(s: any): number {
  const v = String(s ?? "Todo");
  if (v === "InProgress") return 2;
  if (v === "Done") return 3;
  return 1;
}

function priorityRankOf(p: any): number {
  const v = String(p ?? "Medium");
  if (v === "Low") return 1;
  if (v === "High") return 3;
  return 2;
}

function isAuthError(e: any) {
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    msg.includes("missing authorization") ||
    msg.includes("unauthorized") ||
    msg.includes("id token") ||
    msg.includes("jwt") ||
    msg.includes("token expired") ||
    msg.includes("invalid token")
  );
}

/** =========================
 * API JWT helpers
 * ========================= */
function signApiJwt(payload: any, secret: string) {
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: "7d",
    issuer: "tasks-api",
    audience: "tasks-web",
  });
}

function verifyApiJwt(token: string, secret: string) {
  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: "tasks-api",
    audience: "tasks-web",
  }) as { uid: string; email?: string };
}

async function verifySession(req: Request, jwtSecret?: string) {
  const authHeader = String(req.headers.authorization ?? "");
  const m = authHeader.match(/^Bearer (.+)$/);
  if (!m) throw new Error("Missing Authorization: Bearer <token>");

  const token = m[1];

  // 1) API JWT first
  if (jwtSecret) {
    try {
      const p = verifyApiJwt(token, jwtSecret);
      return { uid: p.uid, email: p.email };
    } catch {
      // fallback to Firebase token
    }
  }

  // 2) Firebase ID token fallback
  const decoded = await admin.auth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}

/** =========================
 * Identity Toolkit helpers
 * ========================= */
function mapAuthError(code: string) {
  switch (code) {
    case "EMAIL_EXISTS":
      return { http: 409, message: "Email already in use" };
    case "EMAIL_NOT_FOUND":
    case "INVALID_PASSWORD":
      return { http: 401, message: "Invalid email or password" };
    case "USER_DISABLED":
      return { http: 403, message: "User account is disabled" };
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return { http: 429, message: "Too many attempts. Try again later" };
    default:
      return { http: 400, message: code || "Auth error" };
  }
}

async function callIdentityToolkit(path: string, payload: any, apiKey: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(apiKey)}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: any = await r.json().catch(() => ({}));

  if (!r.ok) {
    const code = String(data?.error?.message ?? "AUTH_ERROR");
    const mapped = mapAuthError(code);
    const err: any = new Error(mapped.message);
    err.http = mapped.http;
    err.code = code;
    throw err;
  }

  return data;
}

/** =========================
 * POST /register
 * ========================= */
export const register = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_WEB_API_KEY, TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

      const body: any = req.body ?? {};
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");

      if (!email) return sendError(res, 400, "Email is required");
      if (password.length < 6) return sendError(res, 400, "Password must be at least 6 characters");

      const apiKey = TASKS_WEB_API_KEY.value();
      const data = await callIdentityToolkit(
        "accounts:signUp",
        { email, password, returnSecureToken: true },
        apiKey
      );

      const accessToken = signApiJwt({ uid: data.localId, email }, TASKS_JWT_SECRET.value());

      return sendJson(res, 201, { uid: data.localId, accessToken, tokenType: "Bearer" });
    } catch (e: any) {
      logger.error("register error", e);
      return sendError(res, Number(e?.http ?? 500), e?.message ?? "Error");
    }
  }
);

/** =========================
 * POST /login
 * ========================= */
export const login = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_WEB_API_KEY, TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

      const body: any = req.body ?? {};
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");

      if (!email || !password) return sendError(res, 400, "Email and password are required");

      const apiKey = TASKS_WEB_API_KEY.value();
      const data = await callIdentityToolkit(
        "accounts:signInWithPassword",
        { email, password, returnSecureToken: true },
        apiKey
      );

      const accessToken = signApiJwt({ uid: data.localId, email }, TASKS_JWT_SECRET.value());

      return sendJson(res, 200, { uid: data.localId, accessToken, tokenType: "Bearer" });
    } catch (e: any) {
      logger.error("login error", e);
      return sendError(res, Number(e?.http ?? 500), e?.message ?? "Error");
    }
  }
);

/** =========================
 * POST /changePassword
 * ========================= */
export const changePassword = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_WEB_API_KEY, TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

      const session = await verifySession(req, TASKS_JWT_SECRET.value());
      const email = String(session.email ?? "").trim().toLowerCase();

      const body: any = req.body ?? {};
      const currentPassword = String(body.currentPassword ?? "");
      const newPassword = String(body.newPassword ?? "");

      if (!email) return sendError(res, 400, "Your account has no email");
      if (currentPassword.length < 6) return sendError(res, 400, "Current password is invalid");
      if (newPassword.length < 6) return sendError(res, 400, "New password must be at least 6 characters");
      if (newPassword === currentPassword) return sendError(res, 400, "New password must be different");

      const apiKey = TASKS_WEB_API_KEY.value();

      const signIn = await callIdentityToolkit(
        "accounts:signInWithPassword",
        { email, password: currentPassword, returnSecureToken: true },
        apiKey
      );

      await callIdentityToolkit("accounts:update", { idToken: signIn.idToken, password: newPassword }, apiKey);

      return sendJson(res, 200, { ok: true });
    } catch (e: any) {
      logger.error("changePassword error", e);
      const http = Number(e?.http ?? (isAuthError(e) ? 401 : 500));
      return sendError(res, http, e?.message ?? "Error");
    }
  }
);

/** =========================
 * GET /getTaskStats
 * ========================= */
export const getTaskStats = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "GET") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());

      const snap = await db.collection("tasks").where("ownerUid", "==", uid).get();
      const tasks = snap.docs
        .map((d) => normalizeTaskOut({ id: d.id, ...(d.data() as any) }))
        .filter((t) => !isSoftDeleted(t));

      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "Done").length;
      const completionRate = total ? Math.round((done / total) * 100) : 0;

      return sendJson(res, 200, { total, completionRate });
    } catch (e: any) {
      logger.error("getTaskStats error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);

/** =========================
 * GET /listTasks
 * ========================= */
export const listTasks = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "GET") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());

      // -----------------------------
      // Parse query params
      // -----------------------------
      const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
      const asInt = (v: any, fallback: number) => {
        const n = Number.parseInt(String(v ?? ""), 10);
        return Number.isFinite(n) ? n : fallback;
      };

      const page = clamp(asInt(req.query.page, 1), 1, 10_000);
      const pageSize = clamp(asInt(req.query.pageSize, 10), 1, 50);

      const search = String(req.query.search ?? "").trim();
      const status = String(req.query.status ?? "").trim();     // "" => All
      const priority = String(req.query.priority ?? "").trim(); // "" => All

      const dueFrom = String(req.query.dueFrom ?? "").trim(); // ISO string or ""
      const dueTo = String(req.query.dueTo ?? "").trim();     // ISO string or ""

      const sortFieldRaw = String(req.query.sortField ?? "updatedAt").trim();
      const sortOrderRaw = String(req.query.sortOrder ?? "descend").trim();

      type SortField = "createdAt" | "updatedAt" | "dueDate" | "title" | "priority" | "status";
      const allowedSort: SortField[] = ["createdAt", "updatedAt", "dueDate", "title", "priority", "status"];

      const sortField: SortField = (allowedSort.includes(sortFieldRaw as SortField)
        ? (sortFieldRaw as SortField)
        : "updatedAt");

      const sortOrder: "ascend" | "descend" = sortOrderRaw === "ascend" ? "ascend" : "descend";
      const orderDir: admin.firestore.OrderByDirection = sortOrder === "ascend" ? "asc" : "desc";

      // Firestore-friendly sort mapping
      const firestoreSortField = (f: SortField) => {
        switch (f) {
          case "title":
            return "titleLower";
          case "status":
            return "statusRank";
          case "priority":
            return "priorityRank";
          case "dueDate":
            return "dueDate"; // ISO string
          case "createdAt":
            return "createdAt"; // Timestamp
          case "updatedAt":
          default:
            return "updatedAt"; // Timestamp
        }
      };

      // -----------------------------
      // Base query (owner + not deleted)
      // -----------------------------
      let q: admin.firestore.Query = db
        .collection("tasks")
        .where("ownerUid", "==", uid)
        .where("isDeleted", "==", false);

      // Optional filters
      if (status) q = q.where("status", "==", status);
      if (priority) q = q.where("priority", "==", priority);

      // Due range filters (ISO string compare works with ISO 8601)
      const hasDueRange = !!dueFrom || !!dueTo;
      if (dueFrom) q = q.where("dueDate", ">=", dueFrom);
      if (dueTo) q = q.where("dueDate", "<=", dueTo);

      // -----------------------------
      // SEARCH MODE
      // If search exists, we fetch a limited set then filter+sort+paginate in memory
      // (because Firestore can’t do full substring search)
      // -----------------------------
      if (search) {
        const searchLower = norm(search);
        const tokens = tokenize(search).slice(0, 10); // array-contains-any max=10
        const MAX_SCAN = 300;

        let sq = q;

        // Use tokens if possible to reduce results
        if (tokens.length) {
          sq = sq.where("searchTokens", "array-contains-any", tokens);
        }

        // Stable ordering for scan (cheap + deterministic)
        const snap = await sq.orderBy("updatedAt", "desc").limit(MAX_SCAN).get();

        const all = snap.docs.map((d) => normalizeTaskOut({ id: d.id, ...(d.data() as any) }));

        // strict match: either whole search substring OR all tokens exist in title/desc text
        const wantedTokens = tokenize(searchLower);
        const filtered = all.filter((t: any) => {
          const hay = `${norm(t.title)} ${norm(t.description)}`;
          if (!hay) return false;

          if (searchLower && hay.includes(searchLower)) return true;
          if (wantedTokens.length && wantedTokens.every((tk) => hay.includes(tk))) return true;

          return false;
        });

        // In-memory sorting to match your UI sorts exactly
        const dateNum = (v: any) => {
          const ms = Date.parse(String(v ?? ""));
          return Number.isFinite(ms) ? ms : 0;
        };

        const cmp = (a: any, b: any) => {
          let av: any;
          let bv: any;

          switch (sortField) {
            case "title":
              av = norm(a.title);
              bv = norm(b.title);
              break;
            case "status":
              av = statusRankOf(a.status);
              bv = statusRankOf(b.status);
              break;
            case "priority":
              av = priorityRankOf(a.priority);
              bv = priorityRankOf(b.priority);
              break;
            case "dueDate":
              // Put nulls at end in ASC, at start in DESC
              av = a.dueDate ? dateNum(a.dueDate) : sortOrder === "ascend" ? Number.POSITIVE_INFINITY : 0;
              bv = b.dueDate ? dateNum(b.dueDate) : sortOrder === "ascend" ? Number.POSITIVE_INFINITY : 0;
              break;
            case "createdAt":
              av = dateNum(a.createdAt);
              bv = dateNum(b.createdAt);
              break;
            case "updatedAt":
            default:
              av = dateNum(a.updatedAt);
              bv = dateNum(b.updatedAt);
              break;
          }

          if (av < bv) return sortOrder === "ascend" ? -1 : 1;
          if (av > bv) return sortOrder === "ascend" ? 1 : -1;
          return 0;
        };

        filtered.sort(cmp);

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);

        return sendJson(res, 200, { items, total });
      }

      // -----------------------------
      // NON-SEARCH MODE
      // Fully server-side sort + pagination
      // -----------------------------

      // Firestore rule: if you use range filters on dueDate, you must orderBy dueDate.
      const appliedSortField = hasDueRange ? "dueDate" : sortField;
      const orderByField = firestoreSortField(appliedSortField as SortField);

      const offset = (page - 1) * pageSize;

      const pageSnap = await q
        .orderBy(orderByField, orderDir)
        .offset(offset)
        .limit(pageSize)
        .get();

      const items = pageSnap.docs.map((d) => normalizeTaskOut({ id: d.id, ...(d.data() as any) }));

      // Get total count efficiently if supported
      let total = 0;
      const anyQ: any = q as any;
      if (typeof anyQ.count === "function") {
        const agg = await anyQ.count().get();
        total = Number(agg.data()?.count ?? 0);
      } else {
        // fallback (reads all) — should rarely happen on modern SDK
        const allSnap = await q.get();
        total = allSnap.size;
      }

      return sendJson(res, 200, { items, total });
    } catch (e: any) {
      logger.error("listTasks error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);


/** =========================
 * GET /getTaskById?id=...
 * ========================= */
export const getTaskById = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "GET") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());
      const id = String(req.query.id ?? "");
      if (!id) return sendError(res, 400, "Missing id");

      const doc = await db.collection("tasks").doc(id).get();
      if (!doc.exists) return sendError(res, 404, "Not found");

      const data = doc.data() as any;
      if (data?.ownerUid !== uid) return sendError(res, 403, "Forbidden");

      return sendJson(res, 200, normalizeTaskOut({ id, ...data }));
    } catch (e: any) {
      logger.error("getTaskById error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);

/** =========================
 * POST /createTask
 * ========================= */
export const createTask = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());

      const body: any = req.body ?? {};
      const title = String(body.title ?? "").trim();
      const description = String(body.description ?? "").trim();
      const status = String(body.status ?? "Todo");
      const priority = String(body.priority ?? "Medium");
      const dueDate = body.dueDate ?? null; // ISO string or null

      if (title.length < 2) return sendError(res, 400, "Title must be at least 2 characters");

      const ref = await db.collection("tasks").add({
        ownerUid: uid,
        title,
        description,
        status,
        priority,
        dueDate,

        titleLower: norm(title),
        descriptionLower: norm(description),
        searchTokens: buildSearchTokens(title, description),
        statusRank: statusRankOf(status),
        priorityRank: priorityRankOf(priority),

        isDeleted: false,
        deletedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return sendJson(res, 201, { id: ref.id });
    } catch (e: any) {
      logger.error("createTask error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);

/** =========================
 * PATCH /updateTask?id=... (WRITE REGION)
 * ========================= */
export const updateTask = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_JWT_SECRET] }, // ✅ us-central1 now
  async (req, res) => {
    setCors(res);
    if (handlePreflight(req, res)) return;

    try {
      if (req.method !== "PATCH") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());
      const id = String(req.query.id ?? "");
      if (!id) return sendError(res, 400, "Missing id");

      const ref = db.collection("tasks").doc(id);
      const doc = await ref.get();
      if (!doc.exists) return sendError(res, 404, "Not found");
      if ((doc.data() as any)?.ownerUid !== uid) return sendError(res, 403, "Forbidden");

      const body: any = req.body ?? {};
      const patch: any = {};

      if (body.title !== undefined) {
        const t = String(body.title ?? "").trim();
        patch.title = t;
        patch.titleLower = norm(t);
      }

      if (body.description !== undefined) {
        const d = String(body.description ?? "").trim();
        patch.description = d;
        patch.descriptionLower = norm(d);
      }

      if (body.title !== undefined || body.description !== undefined) {
        const nextTitle =
          body.title !== undefined ? String(body.title ?? "").trim() : String((doc.data() as any)?.title ?? "");
        const nextDesc =
          body.description !== undefined
            ? String(body.description ?? "").trim()
            : String((doc.data() as any)?.description ?? "");
        patch.searchTokens = buildSearchTokens(nextTitle, nextDesc);
      }

      if (body.status !== undefined) {
        const s = String(body.status);
        patch.status = s;
        patch.statusRank = statusRankOf(s);
      }

      if (body.priority !== undefined) {
        const p = String(body.priority);
        patch.priority = p;
        patch.priorityRank = priorityRankOf(p);
      }

      if (body.dueDate !== undefined) {
        patch.dueDate = body.dueDate ?? null;
      }

      patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await ref.update(patch);
      return sendJson(res, 200, { ok: true });
    } catch (e: any) {
      logger.error("updateTask error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);





/** =========================
 * DELETE /softDeleteTask?id=... (WRITE REGION)
 * ========================= */
export const softDeleteTask = onRequest(
  { ...BASE_OPTS, secrets: [TASKS_JWT_SECRET] }, // ✅ same as updateTask (us-central1)
  async (req, res) => {
    // ✅ Always set CORS first
    setCors(res);

    // ✅ Handle preflight (OPTIONS)
    if (handlePreflight(req, res)) return;

    try {
      // ✅ Restrict to DELETE only
      if (req.method !== "DELETE") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());

      const id = String(req.query.id ?? "");
      if (!id) return sendError(res, 400, "Missing id");

      const ref = db.collection("tasks").doc(id);
      const doc = await ref.get();

      if (!doc.exists) return sendError(res, 404, "Not found");
      if ((doc.data() as any)?.ownerUid !== uid) return sendError(res, 403, "Forbidden");

      await ref.update({
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return sendJson(res, 200, { ok: true });
    } catch (e: any) {
      // ✅ Ensure CORS on errors too
      setCors(res);
      logger.error("softDeleteTask error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);
/** =========================
 * POST /bulkMarkDone (WRITE REGION)
 * Body: { ids: string[] }
 * ========================= */
export const bulkMarkDone = onRequest(
  { ...WRITE_OPTS, secrets: [TASKS_JWT_SECRET] },
  async (req, res) => {
    try {
      if (handlePreflight(req, res)) return;
      if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

      const { uid } = await verifySession(req, TASKS_JWT_SECRET.value());

      const body: any = req.body ?? {};
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      if (!ids.length) return sendError(res, 400, "Missing ids[]");

      const batch = db.batch();

      for (const id of ids.slice(0, 300)) {
        const ref = db.collection("tasks").doc(id);
        const doc = await ref.get();
        if (!doc.exists) continue;
        if ((doc.data() as any)?.ownerUid !== uid) continue;

        batch.update(ref, {
          status: "Done",
          statusRank: statusRankOf("Done"),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      return sendJson(res, 200, { ok: true });
    } catch (e: any) {
      logger.error("bulkMarkDone error", e);
      return sendError(res, isAuthError(e) ? 401 : 500, e?.message ?? "Error");
    }
  }
);
