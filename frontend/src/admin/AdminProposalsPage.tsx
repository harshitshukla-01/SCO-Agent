import React from "react";
import { Bot, Sparkles, ShieldAlert } from "lucide-react";

export const AdminProposalsPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Compliance Proposals</h1>
          <p className="page-description">
            Review, evaluate, and approve changes suggested by the Gemini SOC Agent engine.
          </p>
        </div>
      </div>

      <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.15)",
            color: "#a78bfa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Bot size={32} />
        </div>
        <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "8px" }}>
          Gemini Agent Proposals Active in Phase 4
        </h2>
        <p style={{ color: "#94a3b8", maxWidth: "540px", margin: "0 auto 24px", fontSize: "0.95rem" }}>
          The AI engine will analyze Git repository diffs, propose policy updates, recommend SOC 2 / ISO 27001 test suites, and queue human-in-the-loop approvals here.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.05)", padding: "8px 16px", borderRadius: "9999px", fontSize: "0.85rem", color: "#cbd5e1" }}>
          <Sparkles size={16} color="#a78bfa" />
          <span>Non-Negotiable Rule: Pass/fail comes from deterministic code, never LLM hallucination.</span>
        </div>
      </div>
    </div>
  );
};
