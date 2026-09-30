import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";
import { Policy, Acknowledgement } from "../shared/types";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const UserDashboardPage: React.FC = () => {
  const [publishedPolicies, setPublishedPolicies] = useState<Policy[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [policies, acks] = await Promise.all([
          api.user.getPublishedPolicies(),
          api.user.getMyAcknowledgements(),
        ]);
        setPublishedPolicies(policies);
        setAcknowledgements(acks);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const ackMap = new Map<string, number>();
  acknowledgements.forEach((a) => {
    ackMap.set(a.policy_id, a.version);
  });

  const pendingPolicies = publishedPolicies.filter(
    (p) => ackMap.get(p.id) !== p.current_version
  );

  const acknowledgedCount = publishedPolicies.length - pendingPolicies.length;
  const completionPercentage =
    publishedPolicies.length > 0
      ? Math.round((acknowledgedCount / publishedPolicies.length) * 100)
      : 100;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Compliance Dashboard</h1>
          <p className="page-description">
            Track your security policy acknowledgements and assigned compliance requirements.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>Published Policies</span>
            <BookOpenCheck size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
            {loading ? "..." : publishedPolicies.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
            Active organizational requirements
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>Acknowledged</span>
            <CheckCircle2 size={20} color="#34d399" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#34d399" }}>
            {loading ? "..." : acknowledgedCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
            Signed by your account
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>Pending Action</span>
            <Clock size={20} color={pendingPolicies.length > 0 ? "#fbbf24" : "#34d399"} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: pendingPolicies.length > 0 ? "#fbbf24" : "#34d399" }}>
            {loading ? "..." : pendingPolicies.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
            Requires your review
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>Compliance Status</span>
            <ShieldCheck size={20} color="#818cf8" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
            {loading ? "..." : `${completionPercentage}%`}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
            Readiness completion rate
          </div>
        </div>
      </div>

      {/* Action Banner / Unacknowledged Policies */}
      <div className="card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.15rem", color: "#fff" }}>Policies Pending Your Acknowledgement</h2>
          <Link to="/app/policies" className="btn btn-secondary btn-sm">
            View All Policies <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ color: "#94a3b8", padding: "20px 0" }}>Loading pending policies...</div>
        ) : pendingPolicies.length === 0 ? (
          <div
            style={{
              padding: "24px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <CheckCircle2 size={24} color="#34d399" />
            <div>
              <div style={{ fontWeight: 600, color: "#34d399" }}>You are completely up to date!</div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "2px" }}>
                All currently published security policies have been read and acknowledged by your account.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingPolicies.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "#0d1526",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{p.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                    Version v{p.current_version} • Type: {p.type}
                  </div>
                </div>
                <Link to="/app/policies" className="btn btn-primary btn-sm">
                  Review & Acknowledge
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
