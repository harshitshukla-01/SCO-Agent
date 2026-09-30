from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AuditLogEntry(BaseModel):
    id: str
    actor_uid: str
    actor_email: str
    actor_role: str
    action: str = Field(..., description="Action tag, e.g. POLICY_CREATED, STATUS_CHANGED")
    target_type: str = Field(..., description="Resource type, e.g. policy, member")
    target_id: str = Field(..., description="Resource ID")
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str
