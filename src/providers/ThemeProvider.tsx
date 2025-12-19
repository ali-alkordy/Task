import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

export type ThemeName = "ocean" | "emerald" | "violet" | "amber" | "light";

type ThemeCtx = { theme: ThemeName; setTheme: (t: ThemeName) => void };
const ThemeContext = createContext<ThemeCtx | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider />");
  return ctx;
}

const STORAGE_KEY = "team_tasks_theme";
const THEMES: ThemeName[] = ["ocean", "emerald", "violet", "amber", "light"];

const cssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
};

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    return saved && THEMES.includes(saved) ? saved : "ocean";
  });

  // Keep all tokens here (from CSS vars)
  const [t, setT] = useState(() => ({
    bg: "#020617",
    panel: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    text: "rgba(255,255,255,1)",
    muted: "rgba(255,255,255,0.70)",
    ring: "rgba(59,130,246,0.55)",
    primary: "#2563eb",
    primaryHover: "#3b82f6",
    primaryActive: "#1d4ed8",

    // important for light mode visibility
    placeholder: "rgba(255,255,255,0.45)",
    disabled: "rgba(255,255,255,0.40)",
  }));

  const isLight = theme === "light";

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);

    setT({
      bg: cssVar("--bg", "#020617"),
      panel: cssVar("--panel", "rgba(255,255,255,0.06)"),
      border: cssVar("--panel-border", "rgba(255,255,255,0.12)"),
      text: cssVar("--text", "rgba(255,255,255,1)"),
      muted: cssVar("--muted", "rgba(255,255,255,0.70)"),
      ring: cssVar("--ring", "rgba(59,130,246,0.55)"),
      primary: cssVar("--primary", "#2563eb"),
      primaryHover: cssVar("--primary-hover", "#3b82f6"),
      primaryActive: cssVar("--primary-active", "#1d4ed8"),

      // ✅ if you don’t have these css vars, fallbacks handle it
      placeholder: cssVar(
        "--placeholder",
        isLight ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.45)"
      ),
      disabled: cssVar(
        "--disabled",
        isLight ? "rgba(15,23,42,0.35)" : "rgba(255,255,255,0.40)"
      ),
    });
  }, [theme, isLight]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  // ✅ switch algorithm correctly
  const algorithm = isLight
    ? antdTheme.defaultAlgorithm
    : antdTheme.darkAlgorithm;

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm,
          token: {
            colorBgBase: t.bg,
            colorBgLayout: t.bg,
            colorBgContainer: t.panel,
            colorBgElevated: t.panel,

            colorBorder: t.border,

            colorText: t.text,
            colorTextSecondary: t.muted,

            // ✅ THIS is what fixes “text not showing”
            colorTextPlaceholder: t.placeholder,
            colorTextDisabled: t.disabled,

            colorPrimary: t.primary,
            colorPrimaryHover: t.primaryHover,
            colorPrimaryActive: t.primaryActive,

            controlOutline: t.ring,
            borderRadius: 12,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
