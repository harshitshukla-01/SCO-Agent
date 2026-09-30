import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.auth.firebase import get_firestore_client
from app.models.audit import AuditLogEntry
from app.models.user import AuthenticatedUser


def get_audit_collection(org_id: str):
    db = get_firestore_client()
    return db.collection("organizations").document(org_id).collection("auditLog")


async def record_audit_log(
    org_id: str,
    actor: AuthenticatedUser,
    action: str,
    target_type: str,
    target_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLogEntry:
    """
    Append-only audit log writer.
    Every state change, creation, or sensitive operation must call this.
    """
    entry_id = f"aud_{uuid.uuid4().hex}"
    timestamp = datetime.now(timezone.utc).isoformat()
    
    log_data = {
        "id": entry_id,
        "actor_uid": actor.uid,
        "actor_email": actor.email,
        "actor_role": actor.role.value if hasattr(actor.role, "value") else str(actor.role),
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details or {},
        "timestamp": timestamp,
    }
    
    collection = get_audit_collection(org_id)
    collection.document(entry_id).set(log_data)
    
    return AuditLogEntry(**log_data)


async def list_audit_logs(org_id: str, limit: int = 100) -> List[AuditLogEntry]:
    """
    Retrieve audit log entries for an organization, ordered by timestamp descending.
    """
    collection = get_audit_collection(org_id)
    query = collection.order_by("timestamp", direction="DESCENDING").limit(limit)
    docs = query.stream()
    
    entries: List[AuditLogEntry] = []
    for doc in docs:
        data = doc.to_dict()
        entries.append(AuditLogEntry(**data))
        
    return entries
