from fastapi import APIRouter, Depends
from app.auth.dependencies import require_user
from app.api.user.policies import router as policies_router
from app.api.user.acknowledgements import router as acknowledgements_router

user_router = APIRouter(
    prefix="/user",
    dependencies=[Depends(require_user)],
)

user_router.include_router(policies_router)
user_router.include_router(acknowledgements_router)
