from typing import Optional
from pydantic import BaseModel, Field


class AcknowledgementCreate(BaseModel):
    version: int = Field(..., ge=1, description="Version number being acknowledged")


class Acknowledgement(BaseModel):
    id: str
    policy_id: str
    policy_name: Optional[str] = None
    version: int
    uid: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    timestamp: str
