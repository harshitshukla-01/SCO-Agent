import React from "react";
import { CheckSquare, Sparkles } from "lucide-react";

export const UserTasksPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assigned Tasks & Plain-Language Fixes</h1>
          <p className="page-description">
            Remediate failing technical tests and resolve configuration findings.
          </p>
        </div>
      </div>

      <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.15)",
            color: "#60a5fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <CheckSquare size={32} />
        </div>
        <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "8px" }}>
          Automated Test Engine & Fix Guidance in Phase 2
        </h2>
        <p style={{ color: "#94a3b8", maxWidth: "540px", margin: "0 auto 24px", fontSize: "0.95rem" }}>
          When GitHub integration is connected in Phase 2, automated compliance tests will run on your repository and deliver actionable step-by-step fixes right here.
        </p>
      </div>
    </div>
  );
};
