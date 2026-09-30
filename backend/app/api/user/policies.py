from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from app.auth.dependencies import require_user
from app.audit.logger import record_audit_log
from app.doc_generation.export_service import export_policy
from app.models.acknowledgement import Acknowledgement, AcknowledgementCreate
from app.models.policy import Policy, PolicyStatus, PolicyVersionStatus
from app.models.user import AuthenticatedUser
from app.repositories.acknowledgement_repo import AcknowledgementRepository
from app.repositories.policy_repo import PolicyRepository

router = APIRouter(prefix="/policies", tags=["User Policies"])
policy_repo = PolicyRepository()
ack_repo = AcknowledgementRepository()


@router.get("", response_model=List[Policy])
async def list_published_policies(
    current_user: AuthenticatedUser = Depends(require_user),
):
    """
    Users can only view published compliance policies.
    """
    return policy_repo.list_policies(
        org_id=current_user.org_id, status=PolicyStatus.PUBLISHED
    )


@router.get("/{policy_id}", response_model=Policy)
async def get_published_policy(
    policy_id: str,
    current_user: AuthenticatedUser = Depends(require_user),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if not policy or policy.status != PolicyStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Published policy {policy_id} not found",
        )
    return policy


@router.get("/{policy_id}/export/{format_name}")
async def export_published_policy(
    policy_id: str,
    format_name: Literal["pdf", "docx"],
    version: Optional[int] = Query(None, ge=1),
    current_user: AuthenticatedUser = Depends(require_user),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if policy is None or policy.status != PolicyStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Published policy not found")

    try:
        selected_policy, selected_version, media_type, content, is_draft = await export_policy(
            current_user.org_id, policy_id, format_name, version
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if is_draft or selected_version.status not in (None, PolicyVersionStatus.PUBLISHED):
        raise HTTPException(status_code=404, detail="Published policy version not found")

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_EXPORTED",
        target_type="policy_version",
        target_id=f"{policy_id}:v{selected_version.version_number}",
        details={"policy_id": policy_id, "version": selected_version.version_number, "format": format_name, "draft": False},
    )
    filename = f"{selected_policy.id}-v{selected_version.version_number}.{format_name}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{policy_id}/acknowledge", response_model=Acknowledgement, status_code=status.HTTP_201_CREATED)
async def acknowledge_policy(
    policy_id: str,
    payload: AcknowledgementCreate,
    current_user: AuthenticatedUser = Depends(require_user),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if not policy or policy.status != PolicyStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Published policy {policy_id} not found",
        )

    # Check if user already acknowledged this exact version
    existing = ack_repo.get_user_policy_acknowledgement(
        org_id=current_user.org_id,
        uid=current_user.uid,
        policy_id=policy_id,
        version=payload.version,
    )
    if existing:
        return existing

    ack = ack_repo.create_acknowledgement(
        org_id=current_user.org_id,
        policy_id=policy_id,
        policy_name=policy.name,
        version=payload.version,
        uid=current_user.uid,
        user_email=current_user.email,
        user_name=current_user.name,
    )

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_ACKNOWLEDGED",
        target_type="acknowledgement",
        target_id=ack.id,
        details={
            "policy_id": policy_id,
            "policy_name": policy.name,
            "version": payload.version,
        },
    )

    return ack
