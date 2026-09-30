from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from typing import Deque, Dict, Literal, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.agent.policy_generator import generate_policy_content
from app.audit.logger import record_audit_log
from app.auth.dependencies import require_admin
from app.doc_generation.export_service import export_policy
from app.models.policy import (
    DraftVersionCreate,
    Policy,
    PolicyVersion,
    PolicyVersionStatus,
    PolicyVersionStatusUpdate,
    PolicySource,
)
from app.models.project_facts import ProjectFacts
from app.models.user import AuthenticatedUser
from app.repositories.policy_repo import PolicyRepository
from app.repositories.project_facts_repo import ProjectFactsRepository


router = APIRouter(prefix="/policies", tags=["Policy Generation and Export"])
policy_repo = PolicyRepository()
facts_repo = ProjectFactsRepository()
_generation_requests: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)
_generation_lock = Lock()
_GENERATION_LIMIT = 5
_GENERATION_WINDOW_SECONDS = 60 * 60

VERSION_TRANSITIONS = {
    PolicyVersionStatus.DRAFT: [PolicyVersionStatus.IN_REVIEW, PolicyVersionStatus.DISCARDED],
    PolicyVersionStatus.IN_REVIEW: [PolicyVersionStatus.APPROVED, PolicyVersionStatus.DRAFT],
    PolicyVersionStatus.APPROVED: [PolicyVersionStatus.PUBLISHED, PolicyVersionStatus.IN_REVIEW],
    PolicyVersionStatus.PUBLISHED: [],
    PolicyVersionStatus.DISCARDED: [],
}


def _guard_generation_rate(org_id: str, uid: str):
    key = (org_id, uid)
    now = monotonic()
    with _generation_lock:
        requests = _generation_requests[key]
        while requests and now - requests[0] >= _GENERATION_WINDOW_SECONDS:
            requests.popleft()
        if len(requests) >= _GENERATION_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Policy generation limit reached. Try again later.",
            )
        requests.append(now)


def _effective_version_status(policy: Policy, version: PolicyVersion) -> PolicyVersionStatus:
    if version.status is not None:
        return version.status
    if version.version_number == policy.current_version:
        return PolicyVersionStatus(policy.status.value)
    return PolicyVersionStatus.DRAFT


def _filename(name: str, version_number: int, extension: str) -> str:
    safe_name = "-".join(name.lower().split())
    safe_name = "".join(char for char in safe_name if char.isalnum() or char == "-")
    return f"{safe_name}-v{version_number}.{extension}"


@router.post("/{policy_id}/generate", response_model=PolicyVersion, status_code=status.HTTP_201_CREATED)
async def generate_policy_draft(
    policy_id: str,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    _guard_generation_rate(current_user.org_id, current_user.uid)
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    facts = facts_repo.get(current_user.org_id)
    try:
        content, model_name, fact_sources = await run_in_threadpool(
            generate_policy_content,
            policy.name,
            policy.id,
            policy.type.value,
            facts,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Policy generation failed. Check backend logs and Gemini configuration.") from exc

    version = policy_repo.create_draft_version(
        org_id=current_user.org_id,
        policy_id=policy_id,
        content=content,
        created_by_uid=current_user.uid,
        created_by_email=current_user.email,
        change_note=f"AI-generated draft using {model_name}; project facts v{facts.version}",
        source=PolicySource.AI,
        model_name=model_name,
        fact_sheet_version=facts.version,
        fact_sources=fact_sources,
        derived_from_version=policy.current_version,
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_AI_DRAFT_GENERATED",
        target_type="policy_version",
        target_id=f"{policy_id}:v{version.version_number}",
        details={
            "policy_id": policy_id,
            "version": version.version_number,
            "model": model_name,
            "fact_sheet_version": facts.version,
            "fact_fields": [fact["field"] for fact in fact_sources],
        },
    )
    return version


@router.post("/{policy_id}/versions", response_model=PolicyVersion, status_code=status.HTTP_201_CREATED)
async def save_draft_version(
    policy_id: str,
    payload: DraftVersionCreate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    origin = None
    if payload.derived_from_version is not None:
        origin = policy_repo.get_version(current_user.org_id, policy_id, payload.derived_from_version)

    version = policy_repo.create_draft_version(
        org_id=current_user.org_id,
        policy_id=policy_id,
        content=payload.content,
        created_by_uid=current_user.uid,
        created_by_email=current_user.email,
        change_note=payload.change_note,
        source=origin.source if origin and origin.source == PolicySource.AI else PolicySource.MANUAL,
        model_name=origin.model_name if origin and origin.source == PolicySource.AI else None,
        fact_sheet_version=origin.fact_sheet_version if origin and origin.source == PolicySource.AI else None,
        fact_sources=origin.fact_sources if origin and origin.source == PolicySource.AI else [],
        derived_from_version=payload.derived_from_version,
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_DRAFT_VERSION_SAVED",
        target_type="policy_version",
        target_id=f"{policy_id}:v{version.version_number}",
        details={"policy_id": policy_id, "version": version.version_number},
    )
    return version


@router.patch("/{policy_id}/versions/{version_number}/status", response_model=PolicyVersion)
async def update_draft_version_status(
    policy_id: str,
    version_number: int,
    payload: PolicyVersionStatusUpdate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    policy = policy_repo.get_policy(current_user.org_id, policy_id)
    version = policy_repo.get_version(current_user.org_id, policy_id, version_number)
    if policy is None or version is None:
        raise HTTPException(status_code=404, detail="Policy or version not found")

    current_status = _effective_version_status(policy, version)
    if payload.status not in VERSION_TRANSITIONS.get(current_status, []):
        allowed = ", ".join(item.value for item in VERSION_TRANSITIONS[current_status])
        raise HTTPException(
            status_code=400,
            detail=f"Invalid version transition from {current_status.value}. Allowed: [{allowed}]",
        )

    updated = policy_repo.transition_draft_version(
        org_id=current_user.org_id,
        policy_id=policy_id,
        version_number=version_number,
        new_status=payload.status,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Policy version not found")

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_VERSION_STATUS_CHANGED",
        target_type="policy_version",
        target_id=f"{policy_id}:v{version_number}",
        details={
            "policy_id": policy_id,
            "version": version_number,
            "from_status": current_status.value,
            "to_status": payload.status.value,
            "reason": payload.reason,
        },
    )
    return updated


@router.get("/{policy_id}/export/{format_name}")
async def export_admin_policy(
    policy_id: str,
    format_name: Literal["pdf", "docx"],
    version: Optional[int] = Query(None, ge=1),
    allow_draft: bool = False,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    try:
        policy, selected_version, media_type, content, is_draft = await export_policy(
            current_user.org_id, policy_id, format_name, version
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if is_draft and not allow_draft:
        raise HTTPException(status_code=403, detail="Only approved or published versions can be exported unless allow_draft=true.")

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="POLICY_EXPORTED",
        target_type="policy_version",
        target_id=f"{policy_id}:v{selected_version.version_number}",
        details={"policy_id": policy_id, "version": selected_version.version_number, "format": format_name, "draft": is_draft},
    )
    filename = _filename(policy.name, selected_version.version_number, format_name)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )