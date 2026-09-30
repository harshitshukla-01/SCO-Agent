from fastapi import APIRouter, Depends
from app.auth.dependencies import require_admin
from app.api.admin.members import router as members_router
from app.api.admin.policies import router as policies_router
from app.api.admin.audit import router as audit_router
from app.api.admin.policy_generation import router as policy_generation_router
from app.api.admin.project_facts import router as project_facts_router

admin_router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(require_admin)],
)

admin_router.include_router(members_router)
admin_router.include_router(policies_router)
admin_router.include_router(audit_router)
admin_router.include_router(policy_generation_router)
admin_router.include_router(project_facts_router)
