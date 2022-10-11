from typing import Any, Dict, Optional, Union

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import AuthUser as User
from app.schemas.user import UserCreate, UserUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_superuser=obj_in.is_superuser,
            is_verified=obj_in.is_verified,
            from_lang=obj_in.from_lang,
            to_lang=obj_in.to_lang,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def authenticate(self, db: AsyncSession, *, email: str, password: str) -> Optional[User]:
        luser = await self.get_by_email(db, email=email)
        if not luser:
            return None
        assert luser.hashed_password is not None
        if not verify_password(password, luser.hashed_password):
            return None
        return luser

    def is_active(self, luser: User) -> Optional[bool]:  # pylint: disable=R0201
        return luser.is_active

    def is_verified(self, luser: User) -> Optional[bool]:  # pylint: disable=R0201
        return luser.is_verified

    def is_superuser(self, luser: User) -> Optional[bool]:  # pylint: disable=R0201
        return luser.is_superuser


user = CRUDUser(User)
