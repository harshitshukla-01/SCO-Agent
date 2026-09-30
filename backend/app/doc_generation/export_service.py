from typing import Optional, Tuple

from app.auth.firebase import get_firestore_client
from app.audit.logger import list_audit_logs
from app.doc_generation.exporters import build_docx, build_pdf
from app.models.policy import Policy, PolicyVersion, PolicyVersionStatus
from app.repositories.policy_repo import PolicyRepository


async def export_policy(
    org_id: str,
    policy_id: str,
    format_name: str,
    version_number: Optional[int] = None,
) -> Tuple[Policy, PolicyVersion, str, bytes, bool]:
    repository = PolicyRepository()
    policy = repository.get_policy(org_id, policy_id)
    if policy is None:
        raise LookupError("Policy not found")

    selected_version_number = version_number or policy.current_version
    version = repository.get_version(org_id, policy_id, selected_version_number)
    if version is None:
        raise LookupError("Policy version not found")

    version_status = version.status
    if version_status is None:
        version_status = (
            PolicyVersionStatus(policy.status.value)
            if selected_version_number == policy.current_version
            else PolicyVersionStatus.DRAFT
        )

    approved_by = version.approved_by_email
    approved_at = version.approved_at
    if version_status in (PolicyVersionStatus.APPROVED, PolicyVersionStatus.PUBLISHED) and not approved_at:
        for entry in await list_audit_logs(org_id, limit=500):
            details = entry.details or {}
            if (
                entry.target_id == policy_id
                and entry.action == "POLICY_STATUS_CHANGED"
                and details.get("to_status") == "approved"
            ):
                approved_by = approved_by or entry.actor_email
                approved_at = approved_at or entry.timestamp
                break

    organization_doc = (
        get_firestore_client()
        .collection("organizations")
        .document(org_id)
        .get()
    )
    organization_data = organization_doc.to_dict() if organization_doc.exists else {}
    organization_name = (organization_data or {}).get("name", org_id)
    is_draft = version_status not in (PolicyVersionStatus.APPROVED, PolicyVersionStatus.PUBLISHED)

    if format_name == "docx":
        content = build_docx(policy, version, organization_name, approved_by, approved_at, is_draft)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif format_name == "pdf":
        content = build_pdf(policy, version, organization_name, approved_by, approved_at, is_draft)
        media_type = "application/pdf"
    else:
        raise ValueError("Unsupported export format")

    return policy, version, media_type, content, is_draft