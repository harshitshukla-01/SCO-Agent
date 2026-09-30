import React, { useEffect, useState } from "react";
import { api } from "../shared/api";
import { Member, UserRole } from "../shared/types";
import { UserPlus, Shield, User, AlertCircle, RefreshCw } from "lucide-react";

export const AdminMembersPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("user");
  const [invitePassword, setInvitePassword] = useState("Password123!");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load organization members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    try {
      setIsSubmitting(true);
      await api.admin.inviteMember({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        password: invitePassword || undefined,
      });
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      await loadMembers();
    } catch (err: any) {
      alert("Failed to invite member: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await api.admin.updateMemberRole(uid, newRole);
      await loadMembers();
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Members & Roles</h1>
          <p className="page-description">
            Manage authorized team members and their administrative or user permissions.
          </p>
        </div>
        <button onClick={() => setIsInviteOpen(true)} className="btn btn-primary">
          <UserPlus size={18} />
          Invite Member
        </button>
      </div>

      {error && (
        <div className="card" style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#fb7185", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading organization members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No members found. Run the seed script or invite a new member.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.uid}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="avatar" style={{ background: m.role === "admin" ? "#2563eb" : "#475569" }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#fff" }}>{m.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>UID: {m.uid}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.email}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: m.role === "admin" ? "rgba(59, 130, 246, 0.2)" : "rgba(100, 116, 139, 0.2)",
                          color: m.role === "admin" ? "#60a5fa" : "#94a3b8",
                          borderColor: m.role === "admin" ? "rgba(59, 130, 246, 0.4)" : "rgba(100, 116, 139, 0.4)",
                        }}
                      >
                        {m.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                        {m.role}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "Seed Demo"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <select
                        className="form-select"
                        style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }}
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.uid, e.target.value as UserRole)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleInvite}>
              <div className="modal-header">
                <h2 style={{ fontSize: "1.2rem", color: "#fff" }}>Invite Team Member</h2>
                <button type="button" onClick={() => setIsInviteOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    >
                      <option value="user">User (Standard Member)</option>
                      <option value="admin">Admin (Full Console Access)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Password</label>
                    <input
                      type="text"
                      className="form-input"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsInviteOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? "Inviting..." : "Provision Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
