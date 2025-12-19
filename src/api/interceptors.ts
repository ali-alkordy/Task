import type { AxiosError, AxiosInstance } from "axios";
import { getIdToken, signOut } from "firebase/auth";
import { auth } from "./firebase";

type ApiError = {
  status: number;
  message: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  raw?: unknown;
};

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
  // adjust these if your REST API has auth endpoints.
  // For Firebase SDK auth you typically won't hit these via axios.
  return url.includes("/login") || url.includes("/register") || url.includes("/auth");
}

async function forceLogoutAndRedirect() {
  try {
    await signOut(auth);
  } catch {
    // ignore
  } finally {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
}

export function setupInterceptors(api: AxiosInstance) {
  // ✅ Attach Firebase JWT to requests
  api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;

    if (user && !isAuthUrl(config.url)) {
      const token = await getIdToken(user, false); // normal token
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  // ✅ Handle responses + errors (401 etc.)
  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const ax = err as AxiosError<any>;
      const status = ax.response?.status;

      // Network errors / CORS / offline
      if (!status) {
        return Promise.reject(normalizeError(err));
      }

      const original = ax.config as any;
      if (!original) {
        return Promise.reject(normalizeError(err));
      }

      // ✅ 401 Unauthorized: refresh token once, retry once, else logout
      if (status === 401 && !original.__handled401 && !isAuthUrl(original.url)) {
        original.__handled401 = true;

        const user = auth.currentUser;

        // If we have a user, try refreshing token one time
        if (user) {
          try {
            const freshToken = await getIdToken(user, true); // force refresh
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${freshToken}`;

            return api(original); // retry once with refreshed token
          } catch {
            // refresh failed -> logout
            await forceLogoutAndRedirect();
            return Promise.reject(normalizeError(err));
          }
        }

        // no user -> logout redirect
        await forceLogoutAndRedirect();
        return Promise.reject(normalizeError(err));
      }

      // Optional: 403 forbidden redirect
      if (status === 403) {
        // window.location.href = "/unauthorized";
        return Promise.reject(normalizeError(err));
      }

      return Promise.reject(normalizeError(err));
    }
  );
}
