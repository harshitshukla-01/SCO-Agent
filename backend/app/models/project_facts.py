from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class FactSource(str, Enum):
    DISCOVERED = "discovered"
    MANUAL = "manual"


class ProjectFactValue(BaseModel):
    value: Any = None
    source: FactSource
    evidence: str = ""
    updated_at: str


class ProjectFactInput(BaseModel):
    value: Any = None
    evidence: str = Field(default="", max_length=2000)


class ProjectFactsUpdate(BaseModel):
    fields: Dict[str, ProjectFactInput]


class ProjectFacts(BaseModel):
    id: str = "current"
    version: int = 0
    facts: Dict[str, ProjectFactValue] = Field(default_factory=dict)
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


PROJECT_FACT_FIELDS = {
    "company_name",
    "work_model",
    "data_types",
    "hosting_provider",
    "customer_type",
    "retention_practices",
    "incident_contact",
}


def new_fact_value(value: Any, evidence: str) -> dict:
    return {
        "value": value,
        "source": FactSource.MANUAL.value,
        "evidence": evidence,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }