export type UserRole = "admin" | "user";

export type PolicyType = "technical" | "documentary";

export type PolicyStatus = "draft" | "in_review" | "approved" | "published";

export type PolicySource = "manual" | "ai";
export type PolicyVersionStatus = "draft" | "in_review" | "approved" | "published" | "discarded";

export interface ProjectFactValue {
  value: unknown;
  source: "discovered" | "manual";
  evidence: string;
  updated_at: string;
}

export interface ProjectFacts {
  id: string;
  version: number;
  facts: Record<string, ProjectFactValue>;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface Member {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  content: string;
  change_note: string;
  source: PolicySource;
  created_by: string;
  created_by_email?: string;
  created_at: string;
  status?: PolicyVersionStatus | null;
  model_name?: string | null;
  fact_sheet_version?: number | null;
  fact_sources?: Array<Record<string, unknown>>;
  approved_by?: string | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  derived_from_version?: number | null;
}

export interface Policy {
  id: string;
  name: string;
  type: PolicyType;
  owner?: string | null;
  status: PolicyStatus;
  current_version: number;
  draft_version?: number | null;
  last_reviewed?: string | null;
  next_review?: string | null;
  created_at: string;
  updated_at: string;
  latest_version?: PolicyVersion;
}

export interface Acknowledgement {
  id: string;
  policy_id: string;
  policy_name?: string;
  version: number;
  uid: string;
  user_email?: string;
  user_name?: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  actor_uid: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface CurrentUser {
  uid: string;
  email: string;
  name?: string | null;
  role: UserRole;
  orgId: string;
}
