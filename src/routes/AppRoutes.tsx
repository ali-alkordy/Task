import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from './../pages/auth/AuthPage.tsx';
import TasksPage from './../pages/tasks/TasksPage.tsx';
import RequireAuth from "./RequireAuth";
import AppShell from "../components/layout/AppShell";
import SettingsPage from './../pages/settings/SettingsPage.tsx';
export default function AppRoutes() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<AuthPage />} />

      {/* protected */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* add more protected pages here */}
        </Route>
      </Route>

      {/* default */}
      <Route path="/" element={<Navigate to="/tasks" replace />} />
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
