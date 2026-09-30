from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth
from app.auth.dependencies import require_admin
from app.auth.firebase import get_auth
from app.audit.logger import record_audit_log
from app.models.member import Member, MemberCreate, MemberUpdateRole, RoleEnum
from app.models.user import AuthenticatedUser
from app.repositories.member_repo import MemberRepository

router = APIRouter(prefix="/members", tags=["Admin Members"])
member_repo = MemberRepository()


@router.get("", response_model=List[Member])
async def list_organization_members(
    current_user: AuthenticatedUser = Depends(require_admin),
):
    return member_repo.list_members(current_user.org_id)


@router.post("", response_model=Member, status_code=status.HTTP_201_CREATED)
async def invite_member(
    payload: MemberCreate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    auth_client = get_auth()
    # Check if user already exists in Firebase Auth
    try:
        user_record = auth_client.get_user_by_email(payload.email)
        uid = user_record.uid
    except auth.UserNotFoundError:
        # Create user in Firebase Auth with provided or default temporary password
        temp_password = payload.password or "Password123!"
        user_record = auth_client.create_user(
            email=payload.email,
            password=temp_password,
            display_name=payload.name,
        )
        uid = user_record.uid
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query/create auth user: {str(e)}",
        )

    # Set custom claims
    auth_client.set_custom_user_claims(
        uid,
        {
            "orgId": current_user.org_id,
            "role": payload.role.value if hasattr(payload.role, "value") else str(payload.role),
        },
    )

    # Save to Firestore repository
    member = member_repo.create_member(
        org_id=current_user.org_id,
        uid=uid,
        name=payload.name,
        email=payload.email,
        role=payload.role,
    )

    # Write audit log
    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="MEMBER_INVITED",
        target_type="member",
        target_id=uid,
        details={"name": payload.name, "email": payload.email, "role": payload.role.value},
    )

    return member


@router.patch("/{uid}/role", response_model=Member)
async def update_member_role(
    uid: str,
    payload: MemberUpdateRole,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    member = member_repo.get_member(current_user.org_id, uid)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member {uid} not found in this organization",
        )

    old_role = member.role
    auth_client = get_auth()
    try:
        auth_client.set_custom_user_claims(
            uid,
            {
                "orgId": current_user.org_id,
                "role": payload.role.value if hasattr(payload.role, "value") else str(payload.role),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update auth claims: {str(e)}",
        )

    updated_member = member_repo.update_member_role(
        current_user.org_id, uid, payload.role
    )

    # Write audit log
    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="MEMBER_ROLE_UPDATED",
        target_type="member",
        target_id=uid,
        details={
            "old_role": old_role.value if hasattr(old_role, "value") else str(old_role),
            "new_role": payload.role.value if hasattr(payload.role, "value") else str(payload.role),
        },
    )

    return updated_member
