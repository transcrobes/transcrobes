import logging
from typing import Any, List

from app import crud, models, schemas
from app.api import deps
from app.api.api_v1.subs import publish_message
from app.core.config import settings
from app.data.context import get_broadcast
from app.models import mixins
from app.utils import send_new_account_email
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic.networks import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import select

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[schemas.User])
async def read_users(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    _current_user: models.AuthUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    users = await crud.user.get_multi(db, skip=skip, limit=limit)
    return users


@router.post("/", response_model=schemas.User)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: schemas.UserCreate,
    # _current_user: models.AuthUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    user = await crud.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system.",
        )
    user = await crud.user.create(db, obj_in=user_in)
    if settings.EMAILS_ENABLED and user_in.email:
        send_new_account_email(email_to=user_in.email, username=user_in.username)
    return user


@router.post("/register_classes")
async def register_classes(
    *,
    db: AsyncSession = Depends(deps.get_db),
    registrations: list[schemas.UserRegistration],
    current_user: models.AuthUser = Depends(deps.get_current_active_teacher),
) -> Any:
    """
    Create new user class registrations.
    """
    teachers_to_notify = {current_user.id: current_user}
    students_to_notify = {}
    successes = []
    failures = []
    for registration in registrations:
        user = await crud.user.get_by_email(db, email=registration.email)
        if not user:
            failures.append(registration)
            logger.warning(f"User with email {registration.email} not found registered by {current_user}.")
            continue
        if registration.is_teacher and not user.is_teacher:
            failures.append(registration)
            logger.warning(
                f"Regristree {registration.email} not a teacher for a teacher registeration by {current_user}."
            )
            continue
        if user.from_lang != current_user.from_lang or user.to_lang != current_user.to_lang:
            failures.append(registration)
            logger.warning(
                f"Regristree {registration.email} has a different lang pair registeration by {current_user}."
            )
            continue

        stmt = (
            select(models.LanguageClass)
            .where(models.LanguageClass.created_by_id == current_user.id)
            .where(models.LanguageClass.id == registration.class_id)
        )
        result = await db.execute(stmt)
        obj = result.scalar_one_or_none()
        if not obj or obj.status != mixins.ActivatorMixin.ACTIVE_STATUS:
            # TODO: should we allow this?
            # if obj.status != mixins.ActivatorMixin.ACTIVE_STATUS:
            #     failures.append(registration)
            #     logger.warning(f"Can't register to an inactive class {registration.class_id=}.")
            #     continue

            stmt = (
                select(models.TeacherRegistration)
                .where(models.TeacherRegistration.user_id == current_user.id)
                .where(models.TeacherRegistration.class_id == registration.class_id)
            )
            result = await db.execute(stmt)
            obj = result.scalar_one_or_none()
            if not obj or obj.status != mixins.ActivatorMixin.ACTIVE_STATUS:
                failures.append(registration)
                logger.warning(f"Regristrant {current_user=} is not a current teacher for {registration.class_id=}.")
                continue

        if registration.is_teacher:
            RegType = models.TeacherRegistration
            teachers_to_notify[user.id] = user
        else:
            RegType = models.StudentRegistration
            students_to_notify[user.id] = user
        stmt = select(RegType).where(RegType.class_id == registration.class_id).where(RegType.user_id == user.id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            failures.append(registration)
            await publish_message(RegType.__name__, None, await get_broadcast(), user)
            logger.warning(
                f"Regristree {registration.email} is already registered for {registration.class_id} by {current_user}."
            )
            continue

        db_obj = RegType(
            user_id=user.id,
            class_id=registration.class_id,
            created_by_id=current_user.id,
            updated_by_id=current_user.id,
        )
        db.add(db_obj)
        successes.append(registration)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.exception(e)
        raise HTTPException(
            status_code=500,
            detail="Failed to register users.",
        )
    logger.warning(f"Registered {len(successes)} users for {current_user}.")
    logger.warning(f"Failed to register {len(failures)} users for {current_user}.")

    for user in students_to_notify.values():
        await publish_message(models.StudentRegistration.__name__, None, await get_broadcast(), user)
    for user in teachers_to_notify.values():
        await publish_message(models.TeacherRegistration.__name__, None, await get_broadcast(), user)

    return {"successes": successes, "failures": failures}


@router.put("/me", response_model=schemas.User)
async def update_user_me(
    *,
    db: AsyncSession = Depends(deps.get_db),
    password: str = Body(None),
    full_name: str = Body(None),
    email: EmailStr = Body(None),
    username: str = Body(None),
    current_user: models.AuthUser = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own user.
    """
    current_user_data = jsonable_encoder(current_user)
    user_in = schemas.UserUpdate(**current_user_data)
    if password is not None:
        user_in.password = password
    if full_name is not None:
        user_in.full_name = full_name
    if email is not None:
        user_in.email = email
    if username is not None:
        user_in.username = username
    user = await crud.user.update(db, db_obj=current_user, obj_in=user_in)
    return user


@router.get("/me", response_model=schemas.User)
async def read_user_me(
    _db: AsyncSession = Depends(deps.get_db),
    current_user: models.AuthUser = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/{user_id}", response_model=schemas.User)
async def read_user_by_id(
    user_id: int,
    current_user: models.AuthUser = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get a specific user by id.
    """
    if not crud.user.is_superuser(current_user) and current_user.id != user_id:
        raise HTTPException(status_code=400, detail="The user doesn't have enough privileges")

    user = await crud.user.get(db, cid=user_id)
    return user


@router.put("/{user_id}", response_model=schemas.User)
async def update_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_id: int,
    user_in: schemas.UserUpdate,
    _current_user: models.AuthUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    user = await crud.user.get(db, cid=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system",
        )
    user = await crud.user.update(db, db_obj=user, obj_in=user_in)
    return user
