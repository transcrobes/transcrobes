# -*- coding: utf-8 -*-

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, TypedDict

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.security import ALGORITHM, get_password_hash
from app.utils import generate_validation_token, send_reset_password_email, verify_validation_token
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from starlette.responses import Response

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login/access-token", response_model=schemas.Token)
async def login_access_token(
    response: Response,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.info(f"start of login_access_token with login for user {form_data.username}")
    user = await crud.user.authenticate(db, email=form_data.username, password=form_data.password)
    if not user:
        logger.warning(f"Bad login for user {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not crud.user.is_active(user) or not crud.user.is_verified(user):
        logger.warning(f"Login attempt for inactive/unverified user {form_data.username}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive/unverified user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

    token = security.create_token(user, "access", expires_delta=access_token_expires)
    refresh = security.create_token(user, "refresh", expires_delta=refresh_token_expires)
    response.set_cookie("session", token)
    response.set_cookie("refresh", refresh)
    return {
        "access_token": token,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


class TcToken(TypedDict):
    refresh: str


async def access_from_refresh(token: TcToken, expires_delta: timedelta = None) -> Any:
    try:
        # raises if expired
        payload = jwt.decode(token["refresh"], settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as ex:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        ) from ex
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # FIXME: revalidate here!!!

    to_encode = {
        "token_use": "access",
        "exp": expire,
        "id": str(token_data.id),
        "is_active": bool(token_data.is_active),
        "is_verified": bool(token_data.is_verified),
        "is_superuser": bool(token_data.is_superuser),
        "lang_pair": token_data.lang_pair,
        "translation_providers": token_data.translation_providers,
        "jti": uuid.uuid4().hex,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(
    response: Response,
    refresh: TcToken,
) -> Any:
    """
    Get a new access token from a refresh
    """
    token = await access_from_refresh(refresh)
    response.set_cookie("session", token)
    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/login/test-token", response_model=schemas.User)
async def test_token(
    current_user: models.AuthUser = Depends(deps.get_current_user),
) -> Any:
    """
    Test access token
    """
    return current_user


@router.get("/logout")
def logout(response: Response):
    response.delete_cookie("session")
    response.delete_cookie("refresh")
    return {"ok": True}


@router.post("/password-recovery/{email}", response_model=schemas.Msg)
async def recover_password(email: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """
    Password Recovery
    """
    user = await crud.user.get_by_email(db, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_validation_token(email=email)

    # assert None not in {user.email, email, password_reset_token}
    assert user.email is not None
    # assert email is not None
    # assert password_reset_token is not None
    send_reset_password_email(email_to=user.email, email=email, token=password_reset_token)
    return {"msg": "Password recovery email sent"}


@router.post("/reset-password/", response_model=schemas.Msg)
async def reset_password(
    token: str = Body(...),
    new_password: str = Body(...),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Reset password
    """
    email = verify_validation_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = await crud.user.get_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    if not crud.user.is_active(user):
        raise HTTPException(status_code=400, detail="Inactive user")
    hashed_password = get_password_hash(new_password)
    user.hashed_password = hashed_password
    user.is_verified = True
    db.add(user)
    await db.commit()
    return {"msg": "Password updated successfully"}


@router.get("/validate-email/{token}", response_class=RedirectResponse, status_code=302)
async def validate_email(token: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    """
    Validate email address with a JWT token
    """
    email = verify_validation_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = await crud.user.get_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    if not crud.user.is_active(user):
        raise HTTPException(status_code=400, detail="Inactive user")
    user.is_verified = True
    db.add(user)
    await db.commit()
    return "/#/login/?msg=001"
