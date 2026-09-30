import { auth } from "../firebase";
import {
  Member,
  Policy,
  PolicyStatus,
  PolicyType,
  PolicyVersion,
  Acknowledgement,
  AuditLogEntry,
  UserRole,
  ProjectFacts,
  PolicyVersionStatus,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const currentUser = auth.currentUser;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = `Request failed with status ${response.status}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

async function downloadFile(endpoint: string, fallbackName: string): Promise<void> {
  const currentUser = auth.currentUser;
  const headers: Record<string, string> = {};
  if (currentUser) {
    headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
  if (!response.ok) {
    let detail = `Download failed with status ${response.status}`;
    try {
      detail = (await response.json()).detail || detail;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(detail);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export const api = {
  // Admin Endpoints
  admin: {
    getMembers: () => request<Member[]>("/api/admin/members"),
    inviteMember: (data: { name: string; email: string; role: UserRole; password?: string }) =>
      request<Member>("/api/admin/members", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateMemberRole: (uid: string, role: UserRole) =>
      request<Member>(`/api/admin/members/${uid}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    getPolicies: (status?: PolicyStatus) => {
      const query = status ? `?status=${status}` : "";
      return request<Policy[]>(`/api/admin/policies${query}`);
    },
    getPolicy: (id: string) => request<Policy>(`/api/admin/policies/${id}`),
    createPolicy: (data: {
      name: string;
      type: PolicyType;
      owner?: string;
      next_review?: string;
      initial_content?: string;
      change_note?: string;
    }) =>
      request<Policy>("/api/admin/policies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updatePolicy: (
      id: string,
      data: {
        name?: string;
        type?: PolicyType;
        owner?: string;
        next_review?: string;
        content?: string;
        change_note?: string;
      }
    ) =>
      request<Policy>(`/api/admin/policies/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    updatePolicyStatus: (id: string, status: PolicyStatus, reason?: string) =>
      request<Policy>(`/api/admin/policies/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason }),
      }),
    getVersions: (id: string) => request<PolicyVersion[]>(`/api/admin/policies/${id}/versions`),
    getVersion: (id: string, versionNumber: number) =>
      request<PolicyVersion>(`/api/admin/policies/${id}/versions/${versionNumber}`),
    getAuditLogs: (limit = 100) => request<AuditLogEntry[]>(`/api/admin/audit-log?limit=${limit}`),
    getProjectFacts: () => request<ProjectFacts>("/api/admin/project-facts"),
    saveProjectFacts: (fields: Record<string, { value: unknown; evidence: string }>) =>
      request<ProjectFacts>("/api/admin/project-facts", {
        method: "PUT",
        body: JSON.stringify({ fields }),
      }),
    generatePolicy: (id: string) =>
      request<PolicyVersion>(`/api/admin/policies/${id}/generate`, { method: "POST" }),
    saveDraftVersion: (id: string, data: { content: string; change_note: string; derived_from_version?: number }) =>
      request<PolicyVersion>(`/api/admin/policies/${id}/versions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateVersionStatus: (id: string, version: number, status: PolicyVersionStatus, reason?: string) =>
      request<PolicyVersion>(`/api/admin/policies/${id}/versions/${version}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason }),
      }),
    downloadPolicy: (id: string, format: "pdf" | "docx", version: number, allowDraft: boolean) => {
      const query = new URLSearchParams({ version: String(version) });
      if (allowDraft) query.set("allow_draft", "true");
      return downloadFile(`/api/admin/policies/${id}/export/${format}?${query}`, `${id}-v${version}.${format}`);
    },
  },

  // User Endpoints
  user: {
    getPublishedPolicies: () => request<Policy[]>("/api/user/policies"),
    getPublishedPolicy: (id: string) => request<Policy>(`/api/user/policies/${id}`),
    acknowledgePolicy: (id: string, version: number) =>
      request<Acknowledgement>(`/api/user/policies/${id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ version }),
      }),
    getMyAcknowledgements: () => request<Acknowledgement[]>("/api/user/acknowledgements"),
    downloadPolicy: (id: string, format: "pdf" | "docx", version: number) =>
      downloadFile(`/api/user/policies/${id}/export/${format}?version=${version}`, `${id}-v${version}.${format}`),
  },
};
