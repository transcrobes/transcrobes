import os

from app.core.config import settings
from app.db.base_class import Base
from app.models.lookups import BingApiLookup, EnZhhansABCLookup, ZhhansEnCCCLookup
from app.models.mixins import utcnow
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

DEFAULT_DICTIONARY_ORDERING_ZHHANS_EN = (
    f"{BingApiLookup.SHORT_NAME},{ZhhansEnCCCLookup.SHORT_NAME},{BingApiLookup.FALLBACK_SHORT_NAME}"
)
DEFAULT_DICTIONARY_ORDERING_EN_ZHHANS = (
    f"{BingApiLookup.SHORT_NAME},{EnZhhansABCLookup.SHORT_NAME},{BingApiLookup.FALLBACK_SHORT_NAME}"
)


def absolute_imports_path(user_id: int, filename: str) -> str:
    # file uploads for imports will be uploaded to MEDIA_ROOT/user_<id>/imports/<filename>
    return os.path.join(settings.MEDIA_ROOT, user_imports_path(user_id, filename))


def absolute_resources_path(user_id: int, filename: str) -> str:
    return os.path.join(settings.MEDIA_ROOT, user_resources_path(user_id, filename))


def user_imports_path(user_id: int, filename) -> str:
    return f"user_{user_id}/imports/{filename}"


def user_resources_path(user_id: int, filename) -> str:
    return f"user_{user_id}/resources/{filename}"


class AuthUser(Base):
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    is_teacher = Column(Boolean(), default=False)
    is_verified = Column(Boolean(), default=False)

    cards = relationship("Card", back_populates="user")

    # FIXME: need to implement these!
    last_login = Column(DateTime(True))
    date_joined = Column(DateTime(True), nullable=False, server_default=utcnow())
    username = Column(String(150), nullable=False, index=True, unique=True)

    from_lang = Column(String(20), nullable=False, default="zh-Hans")
    to_lang = Column(String(20), nullable=False, default="en")
    dictionary_ordering = Column(String(50), nullable=False, default=DEFAULT_DICTIONARY_ORDERING_ZHHANS_EN)

    # user config as json, think about turning this into real json
    config = Column(Text, nullable=False, default="")

    updated_at = Column(
        DateTime(True),
        nullable=False,
        onupdate=utcnow(),
        server_default=utcnow(),
        index=True,
    )

    @property
    def lang_pair(self) -> str:
        return f"{self.from_lang}:{self.to_lang}"
