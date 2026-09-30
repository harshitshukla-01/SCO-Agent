import React from "react";
import { Sliders, Github, Shield, Lock } from "lucide-react";

export const AdminSettingsPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Release Gate & Integrations</h1>
          <p className="page-description">
            Configure automated GitHub webhooks, test suites, and public release blocking criteria.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <Github size={24} color="#38bdf8" />
            <h2 style={{ fontSize: "1.1rem", color: "#fff" }}>GitHub App Integration (Phase 2 & 3)</h2>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "16px" }}>
            Connect repositories to automatically detect modified security architecture and comment on PRs.
          </p>
          <button disabled className="btn btn-secondary btn-sm">
            Coming in Phase 2
          </button>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <Shield size={24} color="#34d399" />
            <h2 style={{ fontSize: "1.1rem", color: "#fff" }}>Release Gate Rules (Phase 7)</h2>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "16px" }}>
            Enforce zero critical findings, 100% published policy acknowledgement, and verified diagrams before launch.
          </p>
          <button disabled className="btn btn-secondary btn-sm">
            Coming in Phase 7
          </button>
        </div>
      </div>
    </div>
  );
};
