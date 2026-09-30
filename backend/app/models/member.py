from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RoleEnum(str, Enum):
    ADMIN = "admin"
    USER = "user"


class MemberBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    role: RoleEnum = RoleEnum.USER


class MemberCreate(MemberBase):
    password: Optional[str] = Field(None, min_length=8, description="Initial password if creating account")


class MemberUpdateRole(BaseModel):
    role: RoleEnum


class Member(MemberBase):
    email: str
    uid: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
