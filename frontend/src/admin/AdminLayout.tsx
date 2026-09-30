import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  FileText,
  Users,
  History,
  Bot,
  Sliders,
  LogOut,
  ShieldAlert,
  Building2,
  ClipboardList,
} from "lucide-react";

export const AdminLayout: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-badge">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="logo-title">SOC Agent</div>
            <div className="logo-subtitle">Admin Console</div>
          </div>
        </div>

        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "0.8rem" }}>
          <Building2 size={14} />
          <span>Tenant: <strong style={{ color: "#cbd5e1" }}>{currentUser?.orgId}</strong></span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/admin/policies"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <FileText size={18} />
            <span>Policies Register</span>
          </NavLink>

          <NavLink
            to="/admin/members"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Users size={18} />
            <span>Members & Roles</span>
          </NavLink>

          <NavLink
            to="/admin/project-facts"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <ClipboardList size={18} />
            <span>Project Facts</span>
          </NavLink>

          <NavLink
            to="/admin/audit-log"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <History size={18} />
            <span>Immutable Audit Log</span>
          </NavLink>

          <div style={{ margin: "12px 0 6px", padding: "0 14px", fontSize: "0.7rem", color: "#475569", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
            Future Phases
          </div>

          <NavLink
            to="/admin/proposals"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Bot size={18} />
            <span>AI Proposals (Phase 4)</span>
          </NavLink>

          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Sliders size={18} />
            <span>Release Gate & Integrations</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="avatar">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {currentUser?.name || currentUser?.email}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "capitalize" }}>
                Role: {currentUser?.role}
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
