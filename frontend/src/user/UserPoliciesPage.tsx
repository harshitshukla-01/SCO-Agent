import React, { useEffect, useState } from "react";
import { api } from "../shared/api";
import { Policy, Acknowledgement } from "../shared/types";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Eye,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Download,
} from "lucide-react";

export const UserPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader Modal State
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "docx" | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [policiesData, acksData] = await Promise.all([
        api.user.getPublishedPolicies(),
        api.user.getMyAcknowledgements(),
      ]);
      setPolicies(policiesData);
      setAcknowledgements(acksData);
    } catch (err: any) {
      setError(err.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReader = async (policy: Policy) => {
    try {
      const full = await api.user.getPublishedPolicy(policy.id);
      setSelectedPolicy(full);
    } catch (err: any) {
      alert("Failed to read policy: " + err.message);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedPolicy) return;
    try {
      setIsSubmitting(true);
      await api.user.acknowledgePolicy(selectedPolicy.id, selectedPolicy.current_version);
      await loadData();
      // Update selectedPolicy to refresh modal state
      const updated = await api.user.getPublishedPolicy(selectedPolicy.id);
      setSelectedPolicy(updated);
    } catch (err: any) {
      alert("Failed to submit acknowledgement: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!selectedPolicy) return;
    try {
      setDownloadingFormat(format);
      await api.user.downloadPolicy(selectedPolicy.id, format, selectedPolicy.current_version);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const getAckForPolicy = (policyId: string, version: number) => {
    return acknowledgements.find((a) => a.policy_id === policyId && a.version === version);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Published Compliance Policies</h1>
          <p className="page-description">
            Read and acknowledge official security and compliance policies published for your organization.
          </p>
        </div>
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
                <th>Policy Document</th>
                <th>Type</th>
                <th>Version</th>
                <th>Last Reviewed</th>
                <th>Your Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading published policies...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No published policies available yet. An administrator must approve and publish policies from the Admin Console.
                  </td>
                </tr>
              ) : (
                policies.map((p) => {
                  const ack = getAckForPolicy(p.id, p.current_version);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>ID: {p.id}</div>
                      </td>
                      <td>
                        <span className="badge badge-type">{p.type}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#38bdf8" }}>
                          v{p.current_version}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        {p.last_reviewed ? new Date(p.last_reviewed).toLocaleDateString() : "Recently"}
                      </td>
                      <td>
                        {ack ? (
                          <span className="badge badge-published">
                            <CheckCircle2 size={12} />
                            Acknowledged v{ack.version}
                          </span>
                        ) : (
                          <span className="badge badge-draft">
                            <Clock size={12} />
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleOpenReader(p)}
                          className={`btn btn-sm ${ack ? "btn-secondary" : "btn-primary"}`}
                        >
                          <Eye size={14} />
                          {ack ? "Read Document" : "Review & Sign"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Reader Modal */}
      {selectedPolicy && (
        <div className="modal-overlay" onClick={() => setSelectedPolicy(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "800px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ fontSize: "1.25rem", color: "#fff" }}>{selectedPolicy.name}</h2>
                  <span className="badge badge-published">Published</span>
                  <span className="badge badge-type">v{selectedPolicy.current_version}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                  Effective: {selectedPolicy.last_reviewed ? new Date(selectedPolicy.last_reviewed).toLocaleDateString() : "Current"}
                </div>
              </div>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
                <button disabled={downloadingFormat !== null} onClick={() => handleDownload("pdf")} className="btn btn-secondary btn-sm">
                  <Download size={14} /> {downloadingFormat === "pdf" ? "Preparing PDF..." : "Download PDF"}
                </button>
                <button disabled={downloadingFormat !== null} onClick={() => handleDownload("docx")} className="btn btn-secondary btn-sm">
                  <Download size={14} /> {downloadingFormat === "docx" ? "Preparing DOCX..." : "Download DOCX"}
                </button>
              </div>
              {/* Document Markdown Content */}
              <div
                style={{
                  background: "#080c16",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "24px",
                  maxHeight: "420px",
                  overflowY: "auto",
                  marginBottom: "20px",
                }}
              >
                <div className="markdown-body">
                  <pre style={{ whiteSpace: "pre-wrap", background: "transparent", border: "none", padding: 0, color: "#e2e8f0" }}>
                    {selectedPolicy.latest_version?.content || "No document content provided."}
                  </pre>
                </div>
              </div>

              {/* Acknowledgement Status / Action Footer */}
              {(() => {
                const ack = getAckForPolicy(selectedPolicy.id, selectedPolicy.current_version);
                if (ack) {
                  return (
                    <div
                      style={{
                        padding: "16px",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <CheckCircle2 size={20} color="#34d399" />
                        <div>
                          <div style={{ fontWeight: 600, color: "#34d399", fontSize: "0.9rem" }}>
                            Acknowledged on {new Date(ack.timestamp).toLocaleString()}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            Cryptographically recorded with audit ID: {ack.id}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-published">Signed</span>
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      padding: "16px",
                      background: "#0d1526",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>
                        Formal Policy Acknowledgement
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        By clicking acknowledge, you confirm that you have read and understood this policy.
                      </div>
                    </div>
                    <button
                      onClick={handleAcknowledge}
                      disabled={isSubmitting}
                      className="btn btn-success"
                    >
                      <FileCheck2 size={16} />
                      {isSubmitting ? "Recording..." : `Acknowledge v${selectedPolicy.current_version}`}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
