# -*- coding: utf-8 -*-
from __future__ import annotations

from sqlalchemy import Column
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import declarative_mixin, relationship
from sqlalchemy.orm.decl_api import declared_attr
from sqlalchemy.sql import expression
from sqlalchemy.sql.schema import ForeignKey, UniqueConstraint
from sqlalchemy.sql.sqltypes import Boolean, DateTime, Integer, String, Text


class utcnow(expression.FunctionElement):  # pylint: disable=W0223
    type = DateTime()


@compiles(utcnow, "postgresql")
def pg_utcnow(_element, _compiler, **_kw):
    return "TIMEZONE('utc', CURRENT_TIMESTAMP)"


@declarative_mixin
class ActivatorMixin:
    INACTIVE_STATUS = 0
    ACTIVE_STATUS = 1

    status = Column(Integer, nullable=False, default=ACTIVE_STATUS)
    activate_date = Column(DateTime(True), server_default=utcnow())
    deactivate_date = Column(DateTime(True))


@declarative_mixin
class TitleDescriptionMixin:
    title = Column(String(255), nullable=False)
    description = Column(Text)


@declarative_mixin
class RevisionableMixin:
    updated_at = Column(
        DateTime(True),
        nullable=False,
        onupdate=utcnow(),
        server_default=utcnow(),
        index=True,
    )
    deleted = Column(Boolean, nullable=False, default=False)


@declarative_mixin
class TimestampMixin(RevisionableMixin):
    created_at = Column(DateTime(True), nullable=False, server_default=utcnow())

    @declared_attr
    def created_by_id(cls):  # pylint: disable=E0213
        return Column("created_by_id", ForeignKey("authuser.id"), nullable=False)

    @declared_attr
    def created_by(cls):  # pylint: disable=E0213
        return relationship("AuthUser", primaryjoin=f"AuthUser.id == {cls.__name__}.created_by_id")

    @declared_attr
    def updated_by_id(cls):  # pylint: disable=E0213
        return Column("updated_by_id", ForeignKey("authuser.id"), nullable=False)

    @declared_attr
    def updated_by(cls):  # pylint: disable=E0213
        return relationship("AuthUser", primaryjoin=f"AuthUser.id == {cls.__name__}.updated_by_id")


@declarative_mixin
class DetailedMixin(ActivatorMixin, TitleDescriptionMixin, TimestampMixin):
    pass


@declarative_mixin
class ActivatorTimestampMixin(ActivatorMixin, TimestampMixin):
    pass


@declarative_mixin
class JSONLookupMixin:
    id = Column(Integer, primary_key=True)
    source_text = Column(String(2000), nullable=False, index=True)
    response_json = Column(String(25000), nullable=False)
    # TODO: alembic doesn't know how to do this, so they were added manually :-(
    # idx_lower = Index(None, func.lower(source_text))


@declarative_mixin
class CachedAPIJSONLookupMixin(JSONLookupMixin):
    unique = UniqueConstraint("source_text", "from_lang", "to_lang")
    # TODO: alembic doesn't know how to do this, so it was added manually :-(
    # idx_lower = Index(None, func.lower("source_text"), "from_lang", "to_lang")

    __table_args__ = (unique,)

    from_lang = Column(String(20), nullable=False, index=True)
    to_lang = Column(String(20), nullable=False, index=True)
    cached_date = Column(
        DateTime(True),
        nullable=False,
        onupdate=utcnow(),
        server_default=utcnow(),
        index=True,
    )
