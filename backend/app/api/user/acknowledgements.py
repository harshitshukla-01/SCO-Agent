from typing import List
from fastapi import APIRouter, Depends
from app.auth.dependencies import require_user
from app.models.acknowledgement import Acknowledgement
from app.models.user import AuthenticatedUser
from app.repositories.acknowledgement_repo import AcknowledgementRepository

router = APIRouter(prefix="/acknowledgements", tags=["User Acknowledgements"])
ack_repo = AcknowledgementRepository()


@router.get("", response_model=List[Acknowledgement])
async def list_my_acknowledgements(
    current_user: AuthenticatedUser = Depends(require_user),
):
    """
    List all policy acknowledgements recorded by the current authenticated user.
    """
    return ack_repo.list_user_acknowledgements(
        org_id=current_user.org_id,
        uid=current_user.uid,
    )
