import { ConfigProvider, theme as antdTheme } from "antd";
import { useEffect, useMemo, useState } from "react";

type ThemeName = "blue" | "emerald" | "purple";

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>("blue");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", name === "blue" ? "" : name);
  }, [name]);

  const token = useMemo(() => {
    // read vars AFTER data-theme is applied
    const primary = cssVar("--primary") || "#3b82f6";

    return {
      colorPrimary: primary,
      colorInfo: primary,
      borderRadius: 12,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    };
  }, [name]);

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm, // fits your dark UI
        token,
      }}
    >
      {/* simple theme switcher (optional) */}
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <button
          onClick={() => setName("blue")}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
        >
          Blue
        </button>
        <button
          onClick={() => setName("emerald")}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
        >
          Emerald
        </button>
        <button
          onClick={() => setName("purple")}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
        >
          Purple
        </button>
      </div>

      {children}
    </ConfigProvider>
  );
}
