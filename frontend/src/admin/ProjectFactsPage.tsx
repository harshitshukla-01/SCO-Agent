import React, { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { api } from "../shared/api";
import { ProjectFacts } from "../shared/types";

const fields = [
  { key: "company_name", label: "Company name", hint: "The legal or trading name used in internal policies." },
  { key: "work_model", label: "Work model", hint: "For example: remote, office-based, or hybrid." },
  { key: "data_types", label: "Data types collected", hint: "List the kinds of company, employee, and customer data handled." },
  { key: "hosting_provider", label: "Hosting provider", hint: "Name the cloud or hosting provider, or describe on-premises hosting." },
  { key: "customer_type", label: "Customer type", hint: "For example: B2B, B2C, or both." },
  { key: "retention_practices", label: "Retention practices", hint: "Describe known retention and deletion practices; leave unknowns blank." },
  { key: "incident_contact", label: "Incident contact", hint: "Role or contact channel to use for security incident escalation." },
] as const;

type FactForm = Record<string, { value: string; evidence: string }>;

export const ProjectFactsPage: React.FC = () => {
  const [facts, setFacts] = useState<FactForm>({});
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin.getProjectFacts().then((result: ProjectFacts) => {
      const values: FactForm = {};
      for (const field of fields) {
        const fact = result.facts[field.key];
        const value = fact?.value;
        values[field.key] = {
          value: Array.isArray(value) ? value.join("\n") : value == null ? "" : String(value),
          evidence: fact?.evidence || "",
        };
      }
      setFacts(values);
      setVersion(result.version);
    }).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const updateField = (key: string, property: "value" | "evidence", value: string) => {
    setFacts((current) => ({
      ...current,
      [key]: { value: current[key]?.value || "", evidence: current[key]?.evidence || "", [property]: value },
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const fieldsToSave = Object.fromEntries(fields.map((field) => {
        const input = facts[field.key] || { value: "", evidence: "" };
        const value = field.key === "data_types"
          ? input.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
          : input.value.trim();
        return [field.key, { value, evidence: input.evidence.trim() }];
      }));
      const saved = await api.admin.saveProjectFacts(fieldsToSave);
      setVersion(saved.version);
      setMessage("Project facts saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project facts.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading project facts...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Facts</h1>
          <p className="page-description">Admin-provided context used to draft organization-specific policies.</p>
        </div>
        <span className="badge badge-type">Fact sheet v{version}</span>
      </div>
      <div className="card" style={{ marginBottom: 20, borderColor: "rgba(245, 158, 11, 0.35)" }}>
        <strong>Manual questionnaire</strong>
        <p className="page-description" style={{ marginTop: 6 }}>
          Repository discovery is not connected. Enter only facts you have verified; unknowns will remain marked for confirmation in generated drafts.
        </p>
      </div>
      {error && <div className="card" role="alert" style={{ marginBottom: 16, color: "#fb7185" }}>{error}</div>}
      {message && <div className="card" role="status" style={{ marginBottom: 16, color: "#34d399" }}>{message}</div>}
      <form onSubmit={save}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {fields.map((field) => (
            <section className="card" key={field.key}>
              <div className="form-group">
                <label className="form-label" htmlFor={`fact-${field.key}`}>{field.label}</label>
                {field.key === "data_types" ? (
                  <textarea id={`fact-${field.key}`} className="form-textarea" rows={3} value={facts[field.key]?.value || ""} onChange={(event) => updateField(field.key, "value", event.target.value)} />
                ) : (
                  <input id={`fact-${field.key}`} className="form-input" value={facts[field.key]?.value || ""} onChange={(event) => updateField(field.key, "value", event.target.value)} />
                )}
                <small style={{ display: "block", color: "var(--text-muted)", marginTop: 6 }}>{field.hint}</small>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`evidence-${field.key}`}>Evidence / source note</label>
                <input id={`evidence-${field.key}`} className="form-input" value={facts[field.key]?.evidence || ""} onChange={(event) => updateField(field.key, "evidence", event.target.value)} placeholder="e.g. Confirmed by operations lead" />
                <small style={{ display: "block", color: "var(--text-muted)", marginTop: 6 }}>Stored with source: manual</small>
              </div>
            </section>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <Check size={16} /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Project Facts"}
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Every save creates a new fact sheet version.</span>
        </div>
      </form>
    </div>
  );
};