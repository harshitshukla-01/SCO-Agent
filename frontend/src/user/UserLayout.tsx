import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  LayoutDashboard,
  BookOpenCheck,
  CheckSquare,
  UploadCloud,
  LogOut,
  Shield,
  Building2,
} from "lucide-react";

export const UserLayout: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="app-container">
      {/* User Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-badge" style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}>
            <Shield size={20} />
          </div>
          <div>
            <div className="logo-title">SOC Agent</div>
            <div className="logo-subtitle">Member Portal</div>
          </div>
        </div>

        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "0.8rem" }}>
          <Building2 size={14} />
          <span>Tenant: <strong style={{ color: "#cbd5e1" }}>{currentUser?.orgId}</strong></span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/app/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/app/policies"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <BookOpenCheck size={18} />
            <span>Assigned Policies</span>
          </NavLink>

          <div style={{ margin: "12px 0 6px", padding: "0 14px", fontSize: "0.7rem", color: "#475569", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
            Tasks & Compliance
          </div>

          <NavLink
            to="/app/tasks"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <CheckSquare size={18} />
            <span>Tasks & Fixes (Phase 2)</span>
          </NavLink>

          <NavLink
            to="/app/evidence"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <UploadCloud size={18} />
            <span>Evidence Locker</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="avatar" style={{ background: "#059669" }}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {currentUser?.name || currentUser?.email}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#34d399", textTransform: "capitalize" }}>
                Member Portal
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-secondary btn-sm"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
