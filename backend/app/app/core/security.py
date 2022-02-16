import uuid
from datetime import datetime, timedelta

from app.core.config import settings
from app.models.user import AuthUser
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALGORITHM = "HS256"


def create_token(subject: AuthUser, token_use: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "token_use": token_use,
        "exp": expire,
        "id": str(subject.id),
        "is_active": subject.is_active,
        "is_verified": subject.is_verified,
        "is_superuser": subject.is_superuser,
        "tracking_key": settings.TRACKING_KEY,
        "tracking_endpoint": settings.TRACKING_ENDPOINT,
        "lang_pair": f"{subject.from_lang}:{subject.to_lang}",
        "translation_providers": subject.dictionary_ordering.split(","),
        "jti": uuid.uuid4().hex,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
