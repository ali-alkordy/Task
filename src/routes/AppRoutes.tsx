import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from './../pages/auth/AuthPage.tsx';
import TasksPage from './../pages/tasks/TasksPage.tsx';
import RequireAuth from "./RequireAuth";
import AppShell from "../components/layout/AppShell";
import StatisticsPage from './../pages/statistics/StatisticsPage.tsx';
import SettingsPage from './../pages/settings/SettingsPage.tsx';
import NotFound from '../pages/otherPages/NotFoundPage.tsx';
import Forbidden from "../pages/otherPages/ForbiddenPage.tsx";
import Unauthorized from "../pages/otherPages/UnauthorizedPage.tsx";

export default function AppRoutes() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<AuthPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/forbidden" element={<Forbidden />} />
      {/* protected */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Route>
      </Route>

      {/* default */}
      <Route path="/" element={<Navigate to="/tasks" replace />} />
<Route path="*" element={<NotFound />} />
    </Routes>
  );
}
