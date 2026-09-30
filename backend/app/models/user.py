from typing import Optional
from pydantic import BaseModel
from app.models.member import RoleEnum


class AuthenticatedUser(BaseModel):
    uid: str
    email: str
    org_id: str
    role: RoleEnum
    name: Optional[str] = None
