from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str]
    token_type: str


class TokenPayload(BaseModel):
    id: int
    is_active: bool
    is_verified: bool
    is_superuser: bool
    is_teacher: Optional[bool]
    lang_pair: str
    translation_providers: list[str]
    token_use: str
    exp: int
    jti: str
