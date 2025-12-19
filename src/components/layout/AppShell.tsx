import { Outlet } from "react-router-dom";
import Navbar from './Navbar.tsx';
export default function AppShell() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] ">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
