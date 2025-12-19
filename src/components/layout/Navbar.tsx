import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, ListTodo, Palette, User, Settings } from "lucide-react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";

import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import { cn } from "../../utils/cn";
import { useTheme, type ThemeName } from "../../providers/ThemeProvider";

const THEME_META: Record<ThemeName, { label: string; dot: string }> = {
  ocean: { label: "Ocean", dot: "bg-blue-500" },
  emerald: { label: "Emerald", dot: "bg-emerald-500" },
  violet: { label: "Violet", dot: "bg-violet-500" },
  amber: { label: "Amber", dot: "bg-amber-500" },
  light: { label: "Light", dot: "bg-slate-300" },
};

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  // Safe fallback for theme
  const safeTheme: ThemeName =
    theme && Object.prototype.hasOwnProperty.call(THEME_META, theme)
      ? theme
      : "ocean";

  const onLogout = async () => {
    await logout();
    toast.info("Signed out");
    navigate("/auth", { replace: true });
  };

  // Theme dropdown items
  const themeItems: MenuProps["items"] = (Object.keys(THEME_META) as ThemeName[]).map(
    (key) => ({
      key,
      label: (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <span
            className={cn("h-2.5 w-2.5 rounded-full", THEME_META[key].dot)}
          />
          <span className="text-[color:var(--text)]">{THEME_META[key].label}</span>
          {safeTheme === key && (
            <span className="ml-auto text-xs text-[color:var(--muted)]">Active</span>
          )}
        </div>
      ),
      onClick: () => setTheme(key),
    })
  );

  // User dropdown items
  const userItems: MenuProps["items"] = [
    {
      key: "email",
      disabled: true,
      label: (
        <div className="px-1 py-0.5">
          <div className="text-xs text-[color:var(--muted)]">Signed in as</div>
          <div className="text-sm font-medium text-[color:var(--text)]">
            {user?.email || "—"}
          </div>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "settings",
      label: (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <Settings size={16} />
          <span className="text-[color:var(--text)]">Settings</span>
        </div>
      ),
      onClick: () => navigate("/settings"), 
    },
    {
      key: "logout",
      danger: true,
      label: (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <LogOut size={16} />
          <span>Logout</span>
        </div>
      ),
      onClick: onLogout,
    },
  ];

  // Shared dropdown overlay styles
const dropdownOverlayClass = cn(
  "theme-dropdown-overlay",
  "[&_.ant-dropdown-menu]:!min-w-[220px]",
  "[&_.ant-dropdown-menu]:!rounded-xl",
  "[&_.ant-dropdown-menu]:!p-1",
  "[&_.ant-dropdown-menu]:!bg-[color:var(--panel-elevated)]",
  "[&_.ant-dropdown-menu]:!border [&_.ant-dropdown-menu]:!border-[color:var(--panel-border)]",
  "[&_.ant-dropdown-menu]:!shadow-[var(--shadow-lg)]",
  "[&_.ant-dropdown-menu]:!backdrop-blur-md",

  "[&_.ant-dropdown-menu-item]:!rounded-lg",
  "[&_.ant-dropdown-menu-item]:!text-[color:var(--text)]",
  "[&_.ant-dropdown-menu-item]:!transition-all",
  "[&_.ant-dropdown-menu-item:hover]:!bg-[color:var(--panel-hover)]",

  // ✅ Danger item styling (Logout)
  "[&_.ant-dropdown-menu-item-danger]:!text-[color:var(--danger-text)]",
  "[&_.ant-dropdown-menu-item-danger:hover]:!bg-[color:var(--danger-bg)]",
  "[&_.ant-dropdown-menu-item-danger:hover]:!text-[color:var(--danger-text)]",
  "[&_.ant-dropdown-menu-item-danger:hover]:!border [&_.ant-dropdown-menu-item-danger:hover]:!border-[color:var(--danger-border)]",

  // divider
  "[&_.ant-dropdown-menu-item-divider]:!my-1 [&_.ant-dropdown-menu-item-divider]:!bg-[color:var(--panel-border)]"
);


  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--panel-border)] bg-[color:var(--bg)]/95 backdrop-blur-sm shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/tasks"
          className="flex items-center gap-2 text-[color:var(--text)] transition-opacity hover:opacity-80"
        >
          <span className="rounded-lg bg-[color:var(--panel)] p-2 border border-[color:var(--panel-border)] shadow-[var(--shadow-sm)]">
            <ListTodo size={18} />
          </span>
          <span className="font-semibold text-[color:var(--text)]">Team Tasks</span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* Tasks Nav Link */}
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                "text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--text)]",
                isActive &&
                  "bg-[color:var(--panel)] text-[color:var(--text)] border border-[color:var(--panel-border)] shadow-[var(--shadow-sm)]"
              )
            }
          >
            Tasks
          </NavLink>

          {/* Theme Chooser Dropdown */}
          <Dropdown
            menu={{ items: themeItems }}
            trigger={["click"]}
            placement="bottomRight"
            overlayClassName={cn(
              dropdownOverlayClass,
              isDark
                ? "[&_.ant-dropdown-menu-item:hover]:!brightness-110"
                : "[&_.ant-dropdown-menu-item:hover]:!brightness-95"
            )}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                "bg-[color:var(--panel)] text-[color:var(--text)] border border-[color:var(--panel-border)] shadow-[var(--shadow-sm)]",
                "hover:bg-[color:var(--panel-hover)] active:scale-95"
              )}
              aria-label="Change theme"
              title="Theme"
            >
              <span className={cn("h-2 w-2 rounded-full", THEME_META[safeTheme].dot)} />
              <Palette size={16} />
              <span className="hidden sm:inline">{THEME_META[safeTheme].label}</span>
            </button>
          </Dropdown>

          {/* Divider */}
          <div className="mx-2 hidden h-6 w-px bg-[color:var(--panel-border)] sm:block" />

          {/* User Dropdown (Avatar button) */}
          <Dropdown
            menu={{ items: userItems }}
            trigger={["click"]}
            placement="bottomRight"
            overlayClassName={dropdownOverlayClass}
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-lg p-2 transition-all",
                "bg-[color:var(--panel)] text-[color:var(--text)] border border-[color:var(--panel-border)] shadow-[var(--shadow-sm)]",
                "hover:bg-[color:var(--panel-hover)] active:scale-95"
              )}
              aria-label="User menu"
              title="Account"
            >
              <User size={18} />
            </button>
          </Dropdown>
        </nav>
      </div>
    </header>
  );
}
