import os

from app.core.config import settings
from app.db.base_class import Base
from app.models.mixins import utcnow
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

# FIXME: this needs to be put somewhere


class BingTranslator:
    SHORT_NAME = "mst"
    FALLBACK_SHORT_NAME = "fbk"


class ZHHANS_EN_CCCedictTranslator:
    SHORT_NAME = "ccc"


# Support dropped, at least temporarily
# class ZHHANS_EN_ABCdictTranslator:
#     SHORT_NAME = "abc"

ds = f"{BingTranslator.SHORT_NAME},{ZHHANS_EN_CCCedictTranslator.SHORT_NAME},{BingTranslator.FALLBACK_SHORT_NAME}"


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

    # my additions
    is_verified = Column(Boolean(), default=False)

    cards = relationship("Card", back_populates="user")

    # FIXME: need to implement these!
    last_login = Column(DateTime(True))
    date_joined = Column(DateTime(True), nullable=False, server_default=utcnow())
    username = Column(String(150), nullable=False, index=True, unique=True)

    from_lang = Column(String(20), nullable=False, default="zh-Hans")
    to_lang = Column(String(20), nullable=False, default="en")
    dictionary_ordering = Column(String(50), nullable=False, default=ds)

    # user config as json, think about turning this into real json
    config = Column(Text, nullable=False, default="")
    # FIXME: implement these
    # default_segment = Column(Boolean, nullable=False)
    # default_glossing = Column(Integer, nullable=False)
    # reading_mode = Column(String(100), nullable=False)
    # font_size_percent = Column(Integer, nullable=False)
    # subtitle_default_segment = Column(Boolean, nullable=False)
    # subtitle_default_glossing = Column(Integer, nullable=False)
    # media_mode = Column(String(100), nullable=False)
    # subtitle_box_width_percent = Column(Integer, nullable=False)
    # subtitle_font_size_percent = Column(Integer, nullable=False)

    @property
    def lang_pair(self) -> str:
        return f"{self.from_lang}:{self.to_lang}"
