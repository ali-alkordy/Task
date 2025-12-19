import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, ListTodo } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../utils/toast";
import { cn } from "../../utils/cn";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    toast.info("Signed out");
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[color:var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/tasks" className="flex items-center gap-2 text-white">
          <span className="rounded-lg bg-white/10 p-2">
            <ListTodo size={18} />
          </span>
          <span className="font-semibold">Team Tasks</span>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white",
                isActive && "bg-white/10 text-white"
              )
            }
          >
            Tasks
          </NavLink>

          <div className="mx-2 hidden h-6 w-px bg-white/10 sm:block" />

          <div className="hidden text-xs text-white/60 sm:block">
            {user?.email}
          </div>

          <button
            onClick={onLogout}
            className="ml-1 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <LogOut size={16} />
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
