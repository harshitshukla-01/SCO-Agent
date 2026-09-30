from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import require_admin
from app.audit.logger import record_audit_log
from app.models.policy import (
    Policy,
    PolicyCreate,
    PolicyUpdate,
    PolicyStatusUpdate,
    PolicyStatus,
    PolicyVersion,
)
from app.models.user import AuthenticatedUser
from app.repositories.policy_repo import PolicyRepository

router = APIRouter(prefix="/policies", tags=["Admin Policies"])
policy_repo = PolicyRepository()

ALLOWED_STATUS_TRANSITIONS = {
    PolicyStatus.DRAFT: [PolicyStatus.IN_REVIEW],
    PolicyStatus.IN_REVIEW: [PolicyStatus.APPROVED, PolicyStatus.DRAFT],
    PolicyStatus.APPROVED: [PolicyStatus.PUBLISHED, PolicyStatus.IN_REVIEW],
    PolicyStatus.PUBLISHED: [PolicyStatus.DRAFT, PolicyStatus.IN_REVIEW],
}


@router.get("", response_model=List[Policy])
async def list_policies(
    status: Optional[PolicyStatus] = Query(None, description="Filter by policy status"),
    current_user: AuthenticatedUser = Depends(require_admin),
):
    return policy_repo.list_policies(current_user.org_id, status=status)


@router.post("", response_model=Policy, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: PolicyCreate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    initial_content = payload.initial_content or f"# {payload.name}\n\nDraft policy specification."
    change_note = payload.change_note or "Initial policy draft"

    policy = policy_repo.create_policy(
        org_id=current_user.org_id,
        name=payload.name,
        policy_type=payload.type,
        owner=payload.owner,
        content=initial_content,
        created_by_uid=current_user.uid,
        created_by_email=current_user.email,
        change_note=change_note,
        next_review=payload.next_review,
    )

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_CREATED",
        target_type="policy",
        target_id=policy.id,
        details={"name": policy.name, "type": policy.type, "status": policy.status},
    )

    return policy


@router.get("/{policy_id}", response_model=Policy)
async def get_policy(
    policy_id: str,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {policy_id} not found",
        )
    return policy


@router.put("/{policy_id}", response_model=Policy)
async def update_policy(
    policy_id: str,
    payload: PolicyUpdate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    existing = policy_repo.get_policy(current_user.org_id, policy_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {policy_id} not found",
        )

    updated_policy = policy_repo.update_policy(
        org_id=current_user.org_id,
        policy_id=policy_id,
        name=payload.name,
        policy_type=payload.type,
        owner=payload.owner,
        content=payload.content,
        change_note=payload.change_note,
        updated_by_uid=current_user.uid,
        updated_by_email=current_user.email,
        next_review=payload.next_review,
    )

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_UPDATED",
        target_type="policy",
        target_id=policy_id,
        details={
            "content_updated": payload.content is not None,
            "new_version": updated_policy.current_version if payload.content is not None else None,
            "change_note": payload.change_note,
        },
    )

    return updated_policy


@router.patch("/{policy_id}/status", response_model=Policy)
async def update_policy_status(
    policy_id: str,
    payload: PolicyStatusUpdate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {policy_id} not found",
        )

    current_status = policy.status
    target_status = payload.status

    if current_status == target_status:
        return policy

    allowed_targets = ALLOWED_STATUS_TRANSITIONS.get(current_status, [])
    if target_status not in allowed_targets:
        allowed_str = ", ".join([s.value for s in allowed_targets])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition from {current_status.value} to {target_status.value}. Allowed target statuses: [{allowed_str}]",
        )

    updated_policy = policy_repo.update_policy_status(
        current_user.org_id,
        policy_id,
        target_status,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_STATUS_CHANGED",
        target_type="policy",
        target_id=policy_id,
        details={
            "from_status": current_status.value,
            "to_status": target_status.value,
            "reason": payload.reason,
        },
    )

    return updated_policy


@router.get("/{policy_id}/versions", response_model=List[PolicyVersion])
async def list_policy_versions(
    policy_id: str,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {policy_id} not found",
        )
    return policy_repo.list_versions(current_user.org_id, policy_id)


@router.get("/{policy_id}/versions/{version_number}", response_model=PolicyVersion)
async def get_policy_version(
    policy_id: str,
    version_number: int,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    version = policy_repo.get_version(current_user.org_id, policy_id, version_number)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy version {version_number} not found for policy {policy_id}",
        )
    return version
