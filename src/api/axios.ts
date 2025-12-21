/* src/api/axios.ts */
import axios, { type AxiosError, type AxiosInstance } from "axios";
import Cookies from "js-cookie";

type ApiError = {
  status: number;
  message: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  raw?: unknown;
};

// ✅ must match what AuthService stores
const KEY_ACCESS = "tasks:accessToken";

function getAccessToken(): string | null {
  return Cookies.get(KEY_ACCESS) ?? null;
}

// ✅ optional helper (use it from AuthService when you set the token)
export function setAccessToken(token: string) {
  Cookies.set(KEY_ACCESS, token, {
    path: "/",
    sameSite: "lax",
    secure: window.location.protocol === "https:",
    // expires: 7, // uncomment if you want it to persist 7 days (otherwise session cookie)
  });
}

function clearAccessToken() {
  Cookies.remove(KEY_ACCESS, { path: "/" });
}

function normalizeError(err: unknown): ApiError {
  const ax = err as AxiosError<any>;
  const status = ax.response?.status ?? 0;
  const data = ax.response?.data;

  return {
    status,
    message:
      data?.message ||
      ax.message ||
      (status ? `Request failed (${status})` : "Network error"),
    traceId: data?.traceId,
    errors: data?.errors,
    raw: data ?? err,
  };
}

function isAuthUrl(url?: string) {
  if (!url) return false;
  // ✅ endpoints that should NOT include Authorization header
  return (
    url.includes("/login") ||
    url.includes("/register") ||
    url.includes("/resetPassword")
  );
}

function getNextParam() {
  return encodeURIComponent(window.location.pathname + window.location.search);
}

function isAlreadyOn(routePrefix: string) {
  return window.location.pathname === routePrefix;
}

function redirectToUnauthorized() {
  if (isAlreadyOn("/unauthorized")) return;
  const next = getNextParam();
  window.location.href = `/unauthorized?next=${next}`;
}

function redirectToForbidden() {
  if (isAlreadyOn("/forbidden")) return;
  const next = getNextParam();
  window.location.href = `/forbidden?next=${next}`;
}


async function forceLogoutAndRedirectUnauthorized() {
  // ✅ clear our API JWT
  clearAccessToken();
  redirectToUnauthorized();
}

/**
 * ✅ One axios instance
 * Default baseURL = your REST API (if you have one)
 */
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/**
 * ✅ Use this when calling Firebase Functions using the same instance
 * Example:
 * axiosInstance.get("/listTasks", functionsConfig())
 */
export function functionsConfig() {
  return { baseURL: import.meta.env.VITE_FUNCTIONS_BASE_URL };
}

export function setupInterceptors(api: AxiosInstance) {
  api.interceptors.request.use((config) => {
    // ✅ attach API JWT to everything except auth endpoints
    const token = getAccessToken();

    if (token && !isAuthUrl(config.url)) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const ax = err as AxiosError<any>;
      const status = ax.response?.status;

      if (!status) return Promise.reject(normalizeError(err));

      const original = ax.config as any;
      if (!original) return Promise.reject(normalizeError(err));

      // ✅ 401 on protected endpoint => clear token + go to Unauthorized page
      if (status === 401 && !original.__handled401 && !isAuthUrl(original.url)) {
        original.__handled401 = true;
        await forceLogoutAndRedirectUnauthorized();
        return Promise.reject(normalizeError(err));
      }

      // ✅ 403 => go to Forbidden page (no logout)
      if (status === 403 && !original.__handled403) {
        original.__handled403 = true;
        redirectToForbidden();
        return Promise.reject(normalizeError(err));
      }

      return Promise.reject(normalizeError(err));
    }
  );
}
