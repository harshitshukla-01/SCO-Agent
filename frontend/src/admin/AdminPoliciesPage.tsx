import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../shared/api";
import {
  Policy,
  PolicyStatus,
  PolicyType,
  PolicyVersion,
  PolicyVersionStatus,
} from "../shared/types";
import {
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileEdit,
  History,
  AlertCircle,
  Eye,
  ShieldCheck,
  Send,
  RotateCcw,
  Sparkles,
  Download,
} from "lucide-react";

export const AdminPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Selected policy for drawer/editor
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null);
  const [versionContent, setVersionContent] = useState<string>("");

  // Create Policy Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<PolicyType>("documentary");
  const [createOwner, setCreateOwner] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Content Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editChangeNote, setEditChangeNote] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftChangeNote, setDraftChangeNote] = useState("Reviewed and edited AI-generated draft");

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFilter = selectedStatus === "all" ? undefined : (selectedStatus as PolicyStatus);
      const data = await api.admin.getPolicies(statusFilter);
      setPolicies(data);
    } catch (err: any) {
      setError(err.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [selectedStatus]);

  const handleOpenPolicy = async (policy: Policy) => {
    try {
      const fullPolicy = await api.admin.getPolicy(policy.id);
      const vers = await api.admin.getVersions(policy.id);
      setActivePolicy(fullPolicy);
      setVersions(vers);
      const preferredVersion = fullPolicy.draft_version || fullPolicy.current_version;
      const selectedVersion = vers.find((version) => version.version_number === preferredVersion)
        || fullPolicy.latest_version;
      if (selectedVersion) {
        setActiveVersionNumber(selectedVersion.version_number);
        setVersionContent(selectedVersion.content);
      }
    } catch (err: any) {
      alert("Error loading policy details: " + err.message);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!activePolicy) return;
    try {
      setIsGenerating(true);
      const generated = await api.admin.generatePolicy(activePolicy.id);
      const [updatedPolicy, updatedVersions] = await Promise.all([
        api.admin.getPolicy(activePolicy.id),
        api.admin.getVersions(activePolicy.id),
      ]);
      setActivePolicy(updatedPolicy);
      setVersions(updatedVersions);
      setActiveVersionNumber(generated.version_number);
      setVersionContent(generated.content);
      setDraftChangeNote("Reviewed and edited AI-generated draft");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Policy generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCandidate = async () => {
    if (!activePolicy || activeVersionNumber == null) return;
    try {
      setIsSubmitting(true);
      const saved = await api.admin.saveDraftVersion(activePolicy.id, {
        content: versionContent,
        change_note: draftChangeNote,
        derived_from_version: activeVersionNumber,
      });
      const [updatedPolicy, updatedVersions] = await Promise.all([
        api.admin.getPolicy(activePolicy.id),
        api.admin.getVersions(activePolicy.id),
      ]);
      setActivePolicy(updatedPolicy);
      setVersions(updatedVersions);
      setActiveVersionNumber(saved.version_number);
      setVersionContent(saved.content);
      await loadPolicies();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save draft version.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCandidateStatus = async (targetStatus: PolicyVersionStatus, reason: string) => {
    if (!activePolicy || activeVersionNumber == null) return;
    try {
      setIsSubmitting(true);
      await api.admin.updateVersionStatus(activePolicy.id, activeVersionNumber, targetStatus, reason);
      const [updatedPolicy, updatedVersions] = await Promise.all([
        api.admin.getPolicy(activePolicy.id),
        api.admin.getVersions(activePolicy.id),
      ]);
      setActivePolicy(updatedPolicy);
      setVersions(updatedVersions);
      await loadPolicies();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update candidate status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCandidate = async () => {
    if (!activePolicy || activeVersionNumber == null) return;
    try {
      setIsSubmitting(true);
      const saved = await api.admin.saveDraftVersion(activePolicy.id, {
        content: versionContent,
        change_note: draftChangeNote,
        derived_from_version: activeVersionNumber,
      });
      await api.admin.updateVersionStatus(activePolicy.id, saved.version_number, "in_review", "Submitted for compliance review");
      const [updatedPolicy, updatedVersions] = await Promise.all([
        api.admin.getPolicy(activePolicy.id),
        api.admin.getVersions(activePolicy.id),
      ]);
      setActivePolicy(updatedPolicy);
      setVersions(updatedVersions);
      setActiveVersionNumber(saved.version_number);
      setVersionContent(saved.content);
      await loadPolicies();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not submit candidate for review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    if (!activePolicy || activeVersionNumber == null) return;
    const selectedVersion = versions.find((version) => version.version_number === activeVersionNumber);
    const isCurrentVersion = activeVersionNumber === activePolicy.current_version;
    const status = selectedVersion?.status || (isCurrentVersion ? activePolicy.status : "draft");
    const isDraft = status !== "approved" && status !== "published";
    if (isDraft && !window.confirm("This version is a draft. The download will be marked DRAFT - NOT APPROVED. Continue?")) return;
    try {
      await api.admin.downloadPolicy(activePolicy.id, format, activeVersionNumber, isDraft);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const handleStatusChange = async (targetStatus: PolicyStatus, reason?: string) => {
    if (!activePolicy) return;
    try {
      setIsSubmitting(true);
      const updated = await api.admin.updatePolicyStatus(activePolicy.id, targetStatus, reason);
      setActivePolicy(updated);
      await loadPolicies();
    } catch (err: any) {
      alert("Status transition failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName) return;
    try {
      setIsSubmitting(true);
      await api.admin.createPolicy({
        name: createName,
        type: createType,
        owner: createOwner || undefined,
        initial_content: createContent || `# ${createName}\n\nDraft compliance specification.`,
        change_note: "Initial policy draft",
      });
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateContent("");
      await loadPolicies();
    } catch (err: any) {
      alert("Failed to create policy: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePolicy) return;
    try {
      setIsSubmitting(true);
      const updated = await api.admin.updatePolicy(activePolicy.id, {
        content: editContent,
        change_note: editChangeNote || "Content update",
      });
      setActivePolicy(updated);
      const vers = await api.admin.getVersions(activePolicy.id);
      setVersions(vers);
      if (updated.latest_version) {
        setActiveVersionNumber(updated.latest_version.version_number);
        setVersionContent(updated.latest_version.content);
      }
      setIsEditModalOpen(false);
      await loadPolicies();
    } catch (err: any) {
      alert("Failed to update policy: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectVersionView = async (vNumber: number) => {
    if (!activePolicy) return;
    try {
      const ver = await api.admin.getVersion(activePolicy.id, vNumber);
      setActiveVersionNumber(vNumber);
      setVersionContent(ver.content);
    } catch (err: any) {
      alert("Failed to load version: " + err.message);
    }
  };

  const selectedVersion = versions.find((version) => version.version_number === activeVersionNumber);
  const selectedIsCurrent = activePolicy != null && activeVersionNumber === activePolicy.current_version;
  const selectedVersionStatus = selectedVersion?.status || (selectedIsCurrent ? activePolicy?.status : "draft");
  const needsConfirmation = Array.from(versionContent.matchAll(/\[TO CONFIRM:[^\]]+\]/g), (match) => match[0]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Policies Register</h1>
          <p className="page-description">
            Define, review, approve, and publish technical and documentary security controls.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Create Policy
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "0.85rem", marginRight: "6px" }}>
          <Filter size={16} />
          <span>Status:</span>
        </div>
        {["all", "draft", "in_review", "approved", "published"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`btn btn-sm ${selectedStatus === status ? "btn-primary" : "btn-secondary"}`}
            style={{ textTransform: "capitalize" }}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#fb7185", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Policies Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Policy Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Version</th>
                <th>Owner</th>
                <th>Last Reviewed</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    Loading compliance policies...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No policies found matching the selected filter.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{p.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>ID: {p.id}</div>
                    </td>
                    <td>
                      <span className="badge badge-type">{p.type}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${p.status}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "#38bdf8" }}>
                        v{p.current_version}
                      </span>
                    </td>
                    <td style={{ color: p.owner ? "#e2e8f0" : "#64748b" }}>
                      {p.owner || "Unassigned"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {p.last_reviewed ? new Date(p.last_reviewed).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleOpenPolicy(p)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye size={14} />
                        View / Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Detail & Workflow Modal / Drawer */}
      {activePolicy && (
        <div className="modal-overlay" onClick={() => setActivePolicy(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "850px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ fontSize: "1.25rem", color: "#fff" }}>{activePolicy.name}</h2>
                  <span className={`badge badge-${activePolicy.status}`}>
                    {activePolicy.status.replace("_", " ")}
                  </span>
                  <span className="badge badge-type">{activePolicy.type}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                  Active Version: v{activePolicy.current_version} • Viewing: v{activeVersionNumber}
                </div>
                {selectedVersion?.source === "ai" && (
                  <div style={{ marginTop: 8 }}>
                    <span className="badge badge-draft">AI-generated draft - review required</span>
                    <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 5 }}>
                      Model: {selectedVersion.model_name || "Gemini"} • Facts v{selectedVersion.fact_sheet_version ?? 0}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setActivePolicy(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

            <div className="modal-body">
              {/* Status Transition Control Panel */}
              <div
                style={{
                  background: "#0d1526",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "20px",
                  display: activeVersionNumber === activePolicy.current_version ? "flex" : "none",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={18} color="#38bdf8" />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Workflow Actions:</span>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    disabled={isGenerating || isSubmitting}
                    onClick={handleGenerateWithAI}
                    className="btn btn-primary btn-sm"
                    title="Generate a new draft using the current Project Facts"
                  >
                    <Sparkles size={14} />
                    {isGenerating ? "Generating..." : "Generate with AI"}
                  </button>
                  <Link to="/admin/project-facts" className="btn btn-secondary btn-sm">Review Project Facts</Link>
                  {activePolicy.status === "draft" && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleStatusChange("in_review", "Submitted for compliance review")}
                      className="btn btn-primary btn-sm"
                    >
                      <Send size={14} />
                      Submit for Review
                    </button>
                  )}

                  {activePolicy.status === "in_review" && (
                    <>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleStatusChange("approved", "CISO Approval granted")}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle2 size={14} />
                        Approve Policy
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleStatusChange("draft", "Revisions requested")}
                        className="btn btn-danger btn-sm"
                      >
                        <RotateCcw size={14} />
                        Request Revisions (Draft)
                      </button>
                    </>
                  )}

                  {activePolicy.status === "approved" && (
                    <>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleStatusChange("published", "Published organization-wide")}
                        className="btn btn-success btn-sm"
                      >
                        <ShieldCheck size={14} />
                        Publish Policy
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleStatusChange("in_review", "Returned to review")}
                        className="btn btn-secondary btn-sm"
                      >
                        Return to In Review
                      </button>
                    </>
                  )}

                  {activePolicy.status === "published" && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleStatusChange("in_review", "Initiated scheduled revision")}
                      className="btn btn-secondary btn-sm"
                    >
                      <RotateCcw size={14} />
                      Start Revision (In Review)
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditContent(versionContent);
                      setEditChangeNote(`Revision for version ${activePolicy.current_version + 1}`);
                      setIsEditModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <FileEdit size={14} />
                    Edit Content (New Version)
                  </button>
                  <button disabled={isSubmitting} onClick={() => handleDownload("pdf")} className="btn btn-secondary btn-sm">
                    <Download size={14} /> PDF
                  </button>
                  <button disabled={isSubmitting} onClick={() => handleDownload("docx")} className="btn btn-secondary btn-sm">
                    <Download size={14} /> DOCX
                  </button>
                </div>
              </div>

              <p style={{ margin: "-8px 0 18px", color: "#fbbf24", fontSize: "0.78rem" }}>
                AI-generated draft. Review by a qualified person required before use. This tool does not certify compliance.
              </p>

              {isGenerating && <div className="card" role="status" style={{ marginBottom: 16 }}>Gemini is drafting this policy from the saved Project Facts...</div>}

              {needsConfirmation.length > 0 && (
                <div className="card" style={{ marginBottom: 16, borderColor: "rgba(245, 158, 11, 0.45)" }}>
                  <strong style={{ color: "#fbbf24" }}>Items to confirm before approval</strong>
                  <ul style={{ margin: "8px 0 0 20px", color: "#fde68a" }}>
                    {Array.from(new Set(needsConfirmation)).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* Version History Selector */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "8px" }}>
                  <History size={16} />
                  <span>Version History (Click to inspect):</span>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {versions.map((ver) => (
                    <button
                      key={ver.id}
                      onClick={() => selectVersionView(ver.version_number)}
                      className={`btn btn-sm ${activeVersionNumber === ver.version_number ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
                    >
                      v{ver.version_number} ({new Date(ver.created_at).toLocaleDateString()})
                    </button>
                  ))}
                </div>
              </div>

              {/* Markdown Document Content Preview */}
              <div
                style={{
                  background: "#080c16",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "24px",
                  maxHeight: "380px",
                  overflowY: "auto",
                }}
              >
                {selectedVersionStatus === "draft" && activeVersionNumber !== activePolicy.current_version ? (
                  <textarea
                    aria-label="Edit draft policy Markdown"
                    className="form-textarea"
                    rows={18}
                    value={versionContent}
                    onChange={(event) => setVersionContent(event.target.value)}
                    style={{ background: "transparent", border: 0, color: "#e2e8f0", resize: "vertical" }}
                  />
                ) : (
                  <div className="markdown-body">
                    <pre style={{ whiteSpace: "pre-wrap", background: "transparent", border: "none", padding: 0, color: "#e2e8f0" }}>
                      {versionContent || "No content recorded for this version."}
                    </pre>
                  </div>
                )}
              </div>

              {activeVersionNumber !== activePolicy.current_version && (
                <div className="card" style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span className="badge badge-draft">Candidate: {selectedVersionStatus?.replace("_", " ") || "draft"}</span>
                  {selectedVersionStatus === "draft" && (
                    <>
                      <input className="form-input" aria-label="Draft version change note" value={draftChangeNote} onChange={(event) => setDraftChangeNote(event.target.value)} style={{ flex: "1 1 240px" }} />
                      <button disabled={isSubmitting || !versionContent.trim()} onClick={handleSaveCandidate} className="btn btn-primary btn-sm">Save as New Draft Version</button>
                      <button disabled={isSubmitting} onClick={handleSubmitCandidate} className="btn btn-secondary btn-sm">Submit for Review</button>
                      <button disabled={isSubmitting} onClick={() => handleCandidateStatus("discarded", "Draft discarded by administrator")} className="btn btn-danger btn-sm">Discard Draft</button>
                    </>
                  )}
                  {selectedVersionStatus === "in_review" && (
                    <>
                      <button disabled={isSubmitting} onClick={() => handleCandidateStatus("approved", "Approved by administrator")} className="btn btn-success btn-sm">Approve Candidate</button>
                      <button disabled={isSubmitting} onClick={() => handleCandidateStatus("draft", "Revisions requested")} className="btn btn-secondary btn-sm">Return to Draft</button>
                    </>
                  )}
                  {selectedVersionStatus === "approved" && (
                    <>
                      <button disabled={isSubmitting} onClick={() => handleCandidateStatus("published", "Published organization-wide")} className="btn btn-success btn-sm">Publish Candidate</button>
                      <button disabled={isSubmitting} onClick={() => handleCandidateStatus("in_review", "Returned to review")} className="btn btn-secondary btn-sm">Return to Review</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreatePolicy}>
              <div className="modal-header">
                <h2 style={{ fontSize: "1.2rem", color: "#fff" }}>Create New Compliance Policy</h2>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Policy Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Cryptography & Key Management Policy"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Policy Type</label>
                    <select
                      className="form-select"
                      value={createType}
                      onChange={(e) => setCreateType(e.target.value as PolicyType)}
                    >
                      <option value="documentary">Documentary</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Owner (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={createOwner}
                      onChange={(e) => setCreateOwner(e.target.value)}
                      placeholder="e.g. Head of Engineering"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Markdown Content</label>
                  <textarea
                    className="form-textarea"
                    rows={6}
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                    placeholder="# Policy Title&#10;&#10;## 1. Scope & Objective&#10;..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? "Creating..." : "Save Draft Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {isEditModalOpen && activePolicy && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEditContent}>
              <div className="modal-header">
                <h2 style={{ fontSize: "1.2rem", color: "#fff" }}>
                  Edit Policy Content • Creates v{activePolicy.current_version + 1}
                </h2>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Change Note (Required for Audit Trail)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editChangeNote}
                    onChange={(e) => setEditChangeNote(e.target.value)}
                    placeholder="e.g. Added section on cryptographic key rotation"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Policy Markdown Content</label>
                  <textarea
                    className="form-textarea"
                    rows={12}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? "Publishing Version..." : `Save Version v${activePolicy.current_version + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
