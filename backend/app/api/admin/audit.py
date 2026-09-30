from typing import List
from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import require_admin
from app.audit.logger import list_audit_logs
from app.models.audit import AuditLogEntry
from app.models.user import AuthenticatedUser

router = APIRouter(prefix="/audit-log", tags=["Admin Audit Log"])


@router.get("", response_model=List[AuditLogEntry])
async def get_audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: AuthenticatedUser = Depends(require_admin),
):
    return await list_audit_logs(current_user.org_id, limit=limit)
