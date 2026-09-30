import React from "react";
import { UploadCloud } from "lucide-react";

export const UserEvidencePage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Evidence Locker</h1>
          <p className="page-description">
            Upload artifacts, audit screenshots, and manual compliance evidence.
          </p>
        </div>
      </div>

      <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.15)",
            color: "#34d399",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <UploadCloud size={32} />
        </div>
        <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "8px" }}>
          Evidence Collection Active in Later Phases
        </h2>
        <p style={{ color: "#94a3b8", maxWidth: "540px", margin: "0 auto 24px", fontSize: "0.95rem" }}>
          Upload screenshots, audit reports, background check attestations, and security questionnaire answers for SOC 2 auditor inspection.
        </p>
      </div>
    </div>
  );
};
