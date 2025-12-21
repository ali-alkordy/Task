// src/services/Auth/auth.service.ts
import { axiosInstance, functionsConfig } from "../../api/axios";
import type { AuthUser } from "../../context/AuthContext";
import Cookies from "js-cookie";

const KEY_ACCESS = "tasks:accessToken";

// OPTIONAL: keep old keys cleanup (if you previously stored firebase tokens)
const OLD_KEY_ID = "tasks:idToken";
const OLD_KEY_REFRESH = "tasks:refreshToken";

function saveAccessToken(accessToken: string) {
  Cookies.set(KEY_ACCESS, accessToken, {
    path: "/",
    sameSite: "lax",
    secure: window.location.protocol === "https:",
    // expires: 7, // uncomment if you want it to persist 7 days (otherwise session cookie)
  });

  // cleanup old tokens (optional)
  Cookies.remove(OLD_KEY_ID, { path: "/" });
  Cookies.remove(OLD_KEY_REFRESH, { path: "/" });
}

function clearAccessToken() {
  Cookies.remove(KEY_ACCESS, { path: "/" });
}

function readAccessToken() {
  return Cookies.get(KEY_ACCESS) ?? null;
}

// ✅ decode JWT payload (works for your API JWT and Firebase idToken)
function parseJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isExpiredJwt(token: string): boolean {
  const p = parseJwt(token);
  const exp = typeof p?.exp === "number" ? p.exp : null;
  if (!exp) return false; // if missing exp, treat as not expired
  return Date.now() >= exp * 1000;
}

/**
 * ✅ Support both:
 * - Custom JWT: { uid, email }
 * - Firebase idToken: { user_id, email } (or sub)
 */
function userFromToken(token: string): AuthUser | null {
  const p = parseJwt(token);
  if (!p) return null;

  const email = typeof p?.email === "string" ? p.email : null;

  const uid =
    typeof p?.uid === "string"
      ? p.uid
      : typeof p?.user_id === "string"
      ? p.user_id
      : typeof p?.sub === "string"
      ? p.sub
      : null;

  if (!uid || !email) return null;
  return { uid, email };
}

export function getSession(): { user: AuthUser; accessToken: string } | null {
  const accessToken = readAccessToken();
  if (!accessToken) return null;

  if (isExpiredJwt(accessToken)) {
    clearAccessToken();
    return null;
  }

  const user = userFromToken(accessToken);
  if (!user) return null;

  return { user, accessToken };
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const r = await axiosInstance.post(
    "/register",
    { email, password },
    functionsConfig()
  );

  // ✅ accept either naming
  const accessToken: string | undefined = r.data?.accessToken ?? r.data?.idToken;
  const uid: string | undefined = r.data?.uid;

  if (!accessToken) {
    throw new Error("Invalid register response (missing accessToken/idToken)");
  }

  saveAccessToken(accessToken);

  // Prefer token payload (has uid+email)
  const userFromJwt = userFromToken(accessToken);
  if (userFromJwt) return userFromJwt;

  // fallback (rare)
  if (typeof uid === "string" && email) return { uid, email };
  throw new Error("Invalid token (no user info)");
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const r = await axiosInstance.post(
    "/login",
    { email, password },
    functionsConfig()
  );

  // ✅ accept either naming
  const accessToken: string | undefined = r.data?.accessToken ?? r.data?.idToken;
  const uid: string | undefined = r.data?.uid;

  if (!accessToken) {
    throw new Error("Invalid login response (missing accessToken/idToken)");
  }

  saveAccessToken(accessToken);

  const userFromJwt = userFromToken(accessToken);
  if (userFromJwt) return userFromJwt;

  if (typeof uid === "string" && email) return { uid, email };
  throw new Error("Invalid token (no user info)");
}

export async function logout(): Promise<void> {
  clearAccessToken();
}
