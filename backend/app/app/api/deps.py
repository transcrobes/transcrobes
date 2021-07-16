import logging
from typing import Dict, Generator, Optional

import jose
from app import crud, models, schemas
from app.core import security
from app.core.config import settings
from app.db.session import async_session
from fastapi import Depends, HTTPException, status
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.status import HTTP_401_UNAUTHORIZED

logger = logging.getLogger(__name__)


class OAuth2PasswordBearerOrCookie(OAuth2):
    def __init__(
        self,
        tokenUrl: str,
        scheme_name: Optional[str] = None,
        scopes: Optional[Dict[str, str]] = None,
        auto_error: bool = True,
    ):
        if not scopes:
            scopes = {}
        flows = OAuthFlowsModel(password={"tokenUrl": tokenUrl, "scopes": scopes})
        super().__init__(flows=flows, scheme_name=scheme_name, auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[str]:
        found = False
        authorization: str = request.headers.get("Authorization")
        scheme, param = get_authorization_scheme_param(authorization)

        if authorization and scheme.lower() == "bearer":
            found = True
        else:
            param = request.cookies.get("session")
            found = param is not None

        if not found:
            logger.warning(f"Could not find auth in {authorization=} {request.cookies.get('session')=}")
            if not self.auto_error:
                return None
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return param


reusable_oauth2 = OAuth2PasswordBearerOrCookie(tokenUrl=f"{settings.API_V1_STR}/login/access-token")


async def get_db() -> Generator:
    async with async_session() as session:
        yield session


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.AuthUser:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as ex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from ex
    user = await crud.user.get(db, cid=token_data.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def get_current_good_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.AuthUser:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as ex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from ex

    user = await crud.user.get(db, cid=token_data.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not crud.user.is_active(user):
        raise HTTPException(status_code=400, detail="Inactive user")
    if not crud.user.is_verified(user):
        raise HTTPException(status_code=403, detail="Unverified user")

    return user


def get_current_active_user(
    current_user: models.AuthUser = Depends(get_current_user),
) -> models.AuthUser:
    if not crud.user.is_active(current_user):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: models.AuthUser = Depends(get_current_user),
) -> models.AuthUser:
    if not crud.user.is_superuser(current_user):
        raise HTTPException(status_code=400, detail="The user doesn't have enough privileges")
    return current_user


async def get_current_tokenpayload(token: str = Depends(reusable_oauth2)) -> schemas.TokenPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as ex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from ex
    if not token_data.id:
        raise HTTPException(status_code=404, detail="User not found")
    return token_data


def get_current_good_tokenpayload(token: str = Depends(reusable_oauth2)) -> schemas.TokenPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError, jose.exceptions.ExpiredSignatureError) as ex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from ex

    if not token_data.id:
        raise HTTPException(status_code=404, detail="User not found")
    if not token_data.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if not token_data.is_verified:
        raise HTTPException(status_code=403, detail="Unverified user")

    return token_data


def get_current_active_tokenpayload(
    current_user: schemas.TokenPayload = Depends(get_current_tokenpayload),
) -> schemas.TokenPayload:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
