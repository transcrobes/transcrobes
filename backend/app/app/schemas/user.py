import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr


# Class registration
class UserRegistration(BaseModel):
    email: EmailStr
    class_id: uuid.UUID
    is_teacher: Optional[bool] = False


# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = True
    is_verified: Optional[bool] = False
    is_teacher: Optional[bool] = False
    is_superuser: bool = False
    full_name: Optional[str] = None


# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    username: str
    password: str
    from_lang: Optional[str] = "zh-Hans"
    to_lang: Optional[str] = "en"


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True


# Additional properties to return via API
class User(UserInDBBase):
    pass


# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str
