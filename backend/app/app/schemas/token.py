from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str | None
    token_type: str


class TokenPayload(BaseModel):
    id: int
    is_active: bool
    is_verified: bool
    is_superuser: bool
    is_teacher: bool | None
    model_enabled: bool | None
    lang_pair: str
    translation_providers: list[str]
    token_use: str
    exp: int
    jti: str
