from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PolicyType(str, Enum):
    TECHNICAL = "technical"
    DOCUMENTARY = "documentary"


class PolicyStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    PUBLISHED = "published"


class PolicySource(str, Enum):
    MANUAL = "manual"
    AI = "ai"


class PolicyVersionStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    DISCARDED = "discarded"


class PolicyVersionBase(BaseModel):
    content: str
    change_note: str = Field(default="Initial version")
    source: PolicySource = PolicySource.MANUAL


class PolicyVersionCreate(PolicyVersionBase):
    pass


class PolicyVersion(PolicyVersionBase):
    model_config = ConfigDict(protected_namespaces=())

    id: str
    policy_id: str
    version_number: int
    created_by: str
    created_by_email: Optional[str] = None
    created_at: str
    status: Optional[PolicyVersionStatus] = None
    model_name: Optional[str] = None
    fact_sheet_version: Optional[int] = None
    fact_sources: List[Dict[str, Any]] = Field(default_factory=list)
    approved_by: Optional[str] = None
    approved_by_email: Optional[str] = None
    approved_at: Optional[str] = None
    derived_from_version: Optional[int] = None


class PolicyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    type: PolicyType = PolicyType.DOCUMENTARY
    owner: Optional[str] = None
    next_review: Optional[str] = None


class PolicyCreate(PolicyBase):
    initial_content: Optional[str] = "# Policy Content\n\nDraft content..."
    change_note: Optional[str] = "Initial policy draft"


class PolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    type: Optional[PolicyType] = None
    owner: Optional[str] = None
    content: Optional[str] = None
    change_note: Optional[str] = None
    next_review: Optional[str] = None


class PolicyStatusUpdate(BaseModel):
    status: PolicyStatus
    reason: Optional[str] = None


class DraftVersionCreate(BaseModel):
    content: str = Field(..., min_length=1)
    change_note: str = Field(default="Edited AI-generated draft", max_length=500)
    derived_from_version: Optional[int] = None


class PolicyVersionStatusUpdate(BaseModel):
    status: PolicyVersionStatus
    reason: Optional[str] = None


class Policy(PolicyBase):
    id: str
    status: PolicyStatus = PolicyStatus.DRAFT
    current_version: int = 1
    draft_version: Optional[int] = None
    last_reviewed: Optional[str] = None
    created_at: str
    updated_at: str
    latest_version: Optional[PolicyVersion] = None
