import React, { useEffect, useState } from "react";
import { api } from "../shared/api";
import { AuditLogEntry } from "../shared/types";
import { History, Shield, RefreshCw, AlertCircle } from "lucide-react";

export const AdminAuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getAuditLogs(150);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const getActionBadgeStyle = (action: string) => {
    if (action.includes("CREATED") || action.includes("PUBLISHED")) {
      return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
    }
    if (action.includes("STATUS")) {
      return { bg: "rgba(6, 182, 212, 0.15)", text: "#38bdf8", border: "rgba(6, 182, 212, 0.3)" };
    }
    if (action.includes("MEMBER")) {
      return { bg: "rgba(139, 92, 246, 0.15)", text: "#a78bfa", border: "rgba(139, 92, 246, 0.3)" };
    }
    return { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Append-Only Audit Log</h1>
          <p className="page-description">
            Cryptographically sealed, immutable record of all policy status updates, member changes, and administrative actions.
          </p>
        </div>
        <button onClick={loadAuditLogs} className="btn btn-secondary">
          <RefreshCw size={16} />
          Refresh Log
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
                <th>Timestamp (UTC)</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const style = getActionBadgeStyle(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: style.bg,
                            color: style.text,
                            borderColor: style.border,
                            fontSize: "0.7rem",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: "#fff", fontSize: "0.85rem" }}>
                          {log.actor_email}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Role: {log.actor_role} ({log.actor_uid})
                        </div>
                      </td>
                      <td>
                        <div style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                          {log.target_type}: <strong style={{ color: "#fff" }}>{log.target_id}</strong>
                        </div>
                      </td>
                      <td>
                        <pre
                          style={{
                            margin: 0,
                            padding: "6px 8px",
                            background: "#080c16",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                            color: "#94a3b8",
                            maxWidth: "320px",
                            overflowX: "auto",
                          }}
                        >
                          {JSON.stringify(log.details)}
                        </pre>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
