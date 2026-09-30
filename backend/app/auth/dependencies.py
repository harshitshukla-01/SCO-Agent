from typing import Annotated
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from app.auth.firebase import get_auth
from app.models.member import RoleEnum
from app.models.user import AuthenticatedUser

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security)]
) -> AuthenticatedUser:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        auth_client = get_auth()
        decoded_token = auth_client.verify_id_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uid = decoded_token.get("uid")
    email = decoded_token.get("email", "")
    org_id = decoded_token.get("orgId")
    role_str = decoded_token.get("role")
    name = decoded_token.get("name")

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing required orgId claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not role_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing required role claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        role = RoleEnum(role_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid user role: {role_str}",
        )

    return AuthenticatedUser(
        uid=uid,
        email=email,
        org_id=org_id,
        role=role,
        name=name,
    )


async def require_admin(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]
) -> AuthenticatedUser:
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required",
        )
    return current_user


async def require_user(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]
) -> AuthenticatedUser:
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.USER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Organization member role required",
        )
    return current_user
