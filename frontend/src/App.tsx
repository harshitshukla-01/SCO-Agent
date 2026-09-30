import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AdminRoute, UserRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./auth/LoginPage";

import { AdminLayout } from "./admin/AdminLayout";
import { AdminPoliciesPage } from "./admin/AdminPoliciesPage";
import { AdminMembersPage } from "./admin/AdminMembersPage";
import { AdminAuditLogPage } from "./admin/AdminAuditLogPage";
import { AdminProposalsPage } from "./admin/AdminProposalsPage";
import { AdminSettingsPage } from "./admin/AdminSettingsPage";
import { ProjectFactsPage } from "./admin/ProjectFactsPage";

import { UserLayout } from "./user/UserLayout";
import { UserDashboardPage } from "./user/UserDashboardPage";
import { UserPoliciesPage } from "./user/UserPoliciesPage";
import { UserTasksPage } from "./user/UserTasksPage";
import { UserEvidencePage } from "./user/UserEvidencePage";

const RootRedirect: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#94a3b8" }}>
        Loading session...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === "admin") {
    return <Navigate to="/admin/policies" replace />;
  }

  return <Navigate to="/app/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/policies" replace />} />
              <Route path="policies" element={<AdminPoliciesPage />} />
              <Route path="members" element={<AdminMembersPage />} />
              <Route path="project-facts" element={<ProjectFactsPage />} />
              <Route path="audit-log" element={<AdminAuditLogPage />} />
              <Route path="proposals" element={<AdminProposalsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* User Routes */}
          <Route path="/app" element={<UserRoute />}>
            <Route element={<UserLayout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<UserDashboardPage />} />
              <Route path="policies" element={<UserPoliciesPage />} />
              <Route path="tasks" element={<UserTasksPage />} />
              <Route path="evidence" element={<UserEvidencePage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
