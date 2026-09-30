from fastapi import APIRouter, Depends, HTTPException

from app.audit.logger import record_audit_log
from app.auth.dependencies import require_admin
from app.models.project_facts import ProjectFacts, ProjectFactsUpdate
from app.models.user import AuthenticatedUser
from app.repositories.project_facts_repo import ProjectFactsRepository


router = APIRouter(prefix="/project-facts", tags=["Project Facts"])
facts_repo = ProjectFactsRepository()


@router.get("", response_model=ProjectFacts)
async def get_project_facts(
    current_user: AuthenticatedUser = Depends(require_admin),
):
    return facts_repo.get(current_user.org_id)


@router.put("", response_model=ProjectFacts)
async def update_project_facts(
    payload: ProjectFactsUpdate,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    try:
        facts = facts_repo.save(current_user.org_id, payload.fields, current_user.uid)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    await record_audit_log(
        org_id=current_user.org_id,
        actor=current_user,
        action="PROJECT_FACTS_UPDATED",
        target_type="project_facts",
        target_id="current",
        details={"version": facts.version, "fields": sorted(payload.fields)},
    )
    return facts