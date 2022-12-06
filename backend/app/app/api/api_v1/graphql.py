# -*- coding: utf-8 -*-
# pylint: disable=C0302

from __future__ import annotations

import dataclasses
import json
import logging
import os
import re
from collections.abc import Callable
from datetime import datetime
from typing import Any, Optional

import pytz
import strawberry
from app import models
from app.api import deps
from app.api.api_v1.subs import publish_message
from app.api.api_v1.types import (
    Cards,
    CardsInput,
    Characters,
    CommonType,
    Contents,
    ContentsInput,
    DayModelStats,
    Definitions,
    Goals,
    GoalsInput,
    Imports,
    ImportsInput,
    Languageclasses,
    LanguageclassesInput,
    Persons,
    Recentsentences,
    RecentsentencesInput,
    StudentDayModelStats,
    Studentregistrations,
    StudentregistrationsInput,
    StudentWordModelStats,
    Surveys,
    Teacherregistrations,
    TeacherregistrationsInput,
    Userdictionaries,
    UserdictionariesInput,
    Userlists,
    UserlistsInput,
    Usersurveys,
    UsersurveysInput,
    Wordlists,
    WordModelStats,
)
from app.cache import cached_definitions
from app.core.config import settings
from app.data.context import Context
from app.data.models import REQUESTED
from app.db.base_class import Base
from app.db.session import async_session, async_stats_session
from app.enrich import HANZI_JSON_CACHE_FILE_REGEX, latest_character_json_dir_path, latest_definitions_json_dir_path
from app.enrich.data import managers
from app.enrich.models import ensure_cache_preloaded, update_cache
from app.etypes import LANG_PAIR_SEPARATOR
from app.models import stats
from app.models.mixins import ActivatorMixin, DetailedMixin
from app.models.user import AuthUser
from app.ndutils import clean_broadcaster_string, get_from_lang, get_to_lang, within_char_limit
from app.schemas.files import ProcessData
from app.worker.faustus import content_process_topic, list_process_topic
from fastapi.exceptions import HTTPException
from graphql import GraphQLError
from sqlalchemy import tuple_
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import and_, or_, select, text, union
from starlette import status
from starlette.requests import Request
from strawberry.types import ExecutionContext, Info
from strawberry.utils.logging import StrawberryLogger

logger = logging.getLogger(__name__)


# Utility functions
def fill_common(dj_obj: Base, obj: CommonType):
    # user and date related stuff taken care of by CommonInfo
    dj_obj.title = obj.title
    dj_obj.description = obj.description
    dj_obj.deleted = obj.deleted
    dj_obj.status = obj.status

    if obj.activate_date and obj.activate_date > 0:
        dj_obj.activate_date = datetime.fromtimestamp(obj.activate_date, pytz.utc)
    if obj.deactivate_date and obj.deactivate_date > 0:
        dj_obj.deactivate_date = datetime.fromtimestamp(obj.deactivate_date, pytz.utc)


# @strawberry.enum
# class POSTag(Enum):
#     JJ = "ADJ"
#     ...

# @strawberry.enum
# class HSKLevel(Enum):
#     ONE = 1
#     TWO = 2
#     THREE = 3
#     FOUR = 4
#     FIVE = 5
#     SIX = 6


async def filter_cached_definitions(
    db: AsyncSession,
    user: AuthUser,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[Definitions]:
    logger.debug(f"filter_cached_definitions: {user=}, {limit=}, {id=}, {updated_at=} ")
    if not managers.get(user.lang_pair):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Server does not support language pair {user.lang_pair}",
        )

    providers = user.dictionary_ordering.split(",")

    stmt = select(models.CachedDefinition).where(
        and_(
            models.CachedDefinition.from_lang == user.from_lang,
            models.CachedDefinition.to_lang == user.to_lang,
        )
    )
    # if word_id:  # FIXME: can we use this at all?
    #     stmt = stmt.where(models.CachedDefinition.word_id==word_id)

    if not updated_at or updated_at <= 0:
        # FIXME: Here we get the last object from the most recent generated file. There is a small
        # chance that there has been a new file generated since the user downloaded their version
        # so that needs to be fixed. We will only regenarate once a week or so, so later...
        latest_name = os.path.basename(latest_definitions_json_dir_path(user)).split(LANG_PAIR_SEPARATOR)[-1]
        latest_cached_date = datetime.fromtimestamp(float(latest_name.split("-")[1]))
        latest_word_id = int(latest_name.split("-")[2])
        stmt = stmt.where(
            models.CachedDefinition.cached_date == latest_cached_date,
            models.CachedDefinition.word_id == latest_word_id,
        )
        # the order by is probably not necessary, but may be in the future
        # stmt = stmt.order_by(text("cached_date desc, word_id desc")).limit(limit)
        result = await db.execute(stmt)
        try:
            return [Definitions.from_model(result.scalar_one(), providers)]
        except Exception:
            logger.exception(
                f"Error getting DefinitionSet for {str(stmt)=}, {latest_cached_date=}, {latest_word_id=},"
                f" {user.from_lang=}, {user.to_lang=}"
            )
            raise

    updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
    stmt = stmt.where(
        or_(
            (models.CachedDefinition.cached_date > updated_at_datetime),
            and_(
                models.CachedDefinition.cached_date == updated_at_datetime,
                models.CachedDefinition.word_id > int(id),
            ),
        )
    )
    stmt = stmt.order_by(text("cached_date, word_id")).limit(limit)
    try:
        result = await db.execute(stmt)
        defs = [Definitions.from_model(word, providers) for word in result.scalars().all()]
    except Exception:
        logger.exception(f"Error getting DefinitionSet for {stmt=}")
        raise
    return defs


async def filter_day_model_stats(
    user_id: int,
    limit: int,
    updated_at: float = 0,
) -> list[DayModelStats]:
    logger.debug(f"filter_day_model_stats started: {user_id=}, {limit=}, {updated_at=}")

    stmt = select(stats.UserDay).where(stats.UserDay.user_id == user_id)
    updated_at = updated_at or 0
    if updated_at > 0:
        base_query = stats.UserDay.updated_at > updated_at
        stmt = stmt.where(base_query)

    async with async_stats_session() as db:
        result = await db.execute(stmt.order_by("updated_at", "day").limit(limit))
        obj_list = result.scalars().all()
        objs = [DayModelStats.from_model(user_day) for user_day in obj_list]

        logger.debug(f"filter_day_model_stats finished: {user_id=}, {limit=} {updated_at=}")
    return objs


async def filter_student_day_model_stats(
    user_id: int,
    limit: int,
    updated_at: float = 0,
) -> list[StudentDayModelStats]:
    logger.debug(f"filter_student_day_model_stats started: {user_id=}, {limit=}, {updated_at=}")

    dastmt = (
        select(models.StudentRegistration.user_id)
        .join(models.LanguageClass)
        .join(models.TeacherRegistration)
        .where(
            and_(
                models.TeacherRegistration.user_id == user_id,
                models.TeacherRegistration.status == ActivatorMixin.ACTIVE_STATUS,
                models.StudentRegistration.status == ActivatorMixin.ACTIVE_STATUS,
                models.StudentRegistration.deleted == False,  # noqa: E712
                models.TeacherRegistration.deleted == False,  # noqa: E712
            )
        )
    )
    async with async_session() as db:
        stud_ids = (await db.execute(dastmt)).scalars().all()

    stmt = select(stats.UserDay).where(stats.UserDay.user_id.in_(stud_ids))

    updated_at = updated_at or 0
    if updated_at > 0:
        base_query = stats.UserDay.updated_at > updated_at
        stmt = stmt.where(base_query)

    async with async_stats_session() as db:
        result = await db.execute(stmt.order_by("updated_at", "day").limit(limit))
        obj_list = result.scalars().all()
    objs = [StudentDayModelStats.from_model(user_day) for user_day in obj_list]

    logger.debug(f"filter_student_day_model_stats finished: {user_id=}, {limit=} {updated_at=}")
    return objs


class MissingCacheValueException(Exception):
    pass


def add_word_ids(user_words: list, lang_pair: str) -> list:
    filtered_words = []
    for x in user_words:
        if not within_char_limit(x[0], get_from_lang(lang_pair)):
            logger.error("Trying to find an invalid word")
            logger.error(x)
            continue
        filtered_words.append(x)
    for uw in filtered_words:
        val = (cached_definitions[lang_pair].get(uw[0].lower()) or [None, {}])[1].get(uw[0])
        if not val:
            print(uw)
            raise MissingCacheValueException(
                f"Unable to find entry in cache for {uw[0]}, this should not be possible..."
            )
        uw.append(val[2])
    return filtered_words


async def filter_student_word_model_stats(
    user_id: int,
    lang_pair: str,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[StudentWordModelStats]:
    logger.debug(f"filter_student_word_model_stats started: {user_id=}, {limit=}, {id=}, {updated_at=}")
    dastmt = (
        select(models.StudentRegistration.user_id)
        .join(models.LanguageClass)
        .join(models.TeacherRegistration)
        .where(
            and_(
                models.TeacherRegistration.user_id == user_id,
                models.TeacherRegistration.status == ActivatorMixin.ACTIVE_STATUS,
                models.StudentRegistration.status == ActivatorMixin.ACTIVE_STATUS,
                models.StudentRegistration.deleted == False,  # noqa: E712
                models.TeacherRegistration.deleted == False,  # noqa: E712
            )
        )
    )
    async with async_session() as db:
        stud_ids = (await db.execute(dastmt)).scalars().all()

    stmt = select(stats.UserWord).where(stats.UserWord.user_id.in_(stud_ids))

    updated_at = updated_at or 0
    if updated_at > 0:
        base_query = stats.UserWord.updated_at >= updated_at
        stmt = stmt.where(base_query)

    stmt = stmt.order_by("updated_at")
    # WARNING! we can't filter here because we need to get the word_id and filter on that first
    # stmt = stmt.limit(limit)

    async with async_stats_session() as db:
        result = await db.execute(stmt)
        obj_list = result.scalars().all()
    lines = []
    for uw in obj_list:
        lines.append(
            [
                uw.graph,
                uw.nb_seen,
                uw.last_seen,
                uw.nb_checked,
                uw.last_checked,
                uw.nb_seen_since_last_check,
                0,  # uw.is_known,  # unused
                uw.updated_at,
                uw.user_id,
            ]
        )
    try:
        updates = add_word_ids(lines, lang_pair)
    except MissingCacheValueException:
        # This happens because broadcaster actually doesn't work... sigh... encode...
        async with async_session() as db:
            cached_max_timestamp = next(reversed(cached_definitions[lang_pair].values()))[0]
            await update_cache(db, get_from_lang(lang_pair), get_to_lang(lang_pair), cached_max_timestamp)
        updates = add_word_ids(lines, lang_pair)

    updates = [
        user_word
        for user_word in sorted(updates, key=lambda k: (k[7], k[8]))
        if user_word[7] > updated_at or user_word[8] > int(id)
    ]
    if limit > 0:
        updates = updates[:limit]
    logger.debug(f"filter_word_model_stats finished: {user_id=}, {limit=}, {id=}, {updated_at=}")
    return [StudentWordModelStats.from_list(user_word) for user_word in updates]


async def filter_word_model_stats(
    user_id: int,
    lang_pair: str,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[WordModelStats]:
    logger.debug(f"filter_word_model_stats started: {user_id=}, {limit=}, {id=}, {updated_at=}")
    stmt = select(stats.UserWord).where(stats.UserWord.user_id == user_id)
    updated_at = updated_at or 0
    if updated_at > 0:
        base_query = stats.UserWord.updated_at >= updated_at
        stmt = stmt.where(base_query)

    stmt = stmt.order_by("updated_at")
    # WARNING! we can't filter here because we need to get the word_id and filter on that first
    # stmt = stmt.limit(limit)

    async with async_stats_session() as db:
        result = await db.execute(stmt)
        obj_list = result.scalars().all()
    lines = []
    for uw in obj_list:
        lines.append(
            [
                uw.graph,
                uw.nb_seen,
                uw.last_seen,
                uw.nb_checked,
                uw.last_checked,
                uw.nb_seen_since_last_check,
                0,  # uw.is_known,  # unused
                uw.updated_at,
            ]
        )
    try:
        updates = add_word_ids(lines, lang_pair)
    except MissingCacheValueException:
        # This happens because broadcaster actually doesn't work... sigh... encode...
        async with async_session() as db:
            cached_max_timestamp = next(reversed(cached_definitions[lang_pair].values()))[0]
            await update_cache(db, get_from_lang(lang_pair), get_to_lang(lang_pair), cached_max_timestamp)
        updates = add_word_ids(lines, lang_pair)

    updates = [
        user_word
        for user_word in sorted(updates, key=lambda k: (k[7], k[8]))
        if user_word[7] > updated_at or user_word[8] > int(id)
    ]
    if limit > 0:
        updates = updates[:limit]
    logger.debug(f"filter_word_model_stats finished: {user_id=}, {limit=}, {id=}, {updated_at=}")
    return [WordModelStats.from_list(user_word) for user_word in updates]


async def filter_recentsentences(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[Recentsentences]:
    logger.debug(f"{user_id=}, {limit=}, {id=}, {updated_at=} ")
    stmt = select(models.UserRecentSentences).where(models.UserRecentSentences.user_id == user_id)

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = models.UserRecentSentences.updated_at > updated_at_datetime
        if not id:
            stmt = stmt.where(base_query)
        else:
            stmt = stmt.where(
                or_(
                    base_query,
                    and_(
                        models.UserRecentSentences.updated_at == updated_at_datetime,
                        models.UserRecentSentences.word_id > int(id),
                    ),
                )
            )

    result = await db.execute(stmt.order_by("updated_at", "word_id").limit(limit))

    model_list = result.scalars().all()
    item_list = [Recentsentences.from_model(dj_obj) for dj_obj in model_list]
    return item_list


async def filter_cards(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[Cards]:
    logger.debug(f"{user_id=}, {limit=}, {id=}, {updated_at=} ")
    stmt = select(models.Card).where(models.Card.user_id == user_id)

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = models.Card.updated_at > updated_at_datetime
        if not id:
            stmt = stmt.where(base_query)
        else:
            word_id, card_type = map(int, id.split("-"))
            stmt = stmt.where(
                or_(
                    base_query,
                    or_(
                        and_(
                            models.Card.updated_at == updated_at_datetime,
                            models.Card.word_id > word_id,
                        ),
                        and_(
                            models.Card.updated_at == updated_at_datetime,
                            models.Card.word_id == word_id,
                            models.Card.card_type > card_type,
                        ),
                    ),
                )
            )
    result = await db.execute(stmt.order_by("updated_at", "word_id", "card_type").limit(limit))
    model_list = result.scalars().all()
    card_list = [Cards.from_model(dj_card) for dj_card in model_list]
    return card_list


async def filter_wordlists(
    db: AsyncSession,
    user: AuthUser,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[CommonType]:

    logger.debug(
        f"filter_wordlists started: {user.id=}, {limit=}, {id=}, {updated_at=}, {Wordlists=}, {models.UserList=}"
    )

    stmt = (
        select(models.UserList)
        .where(
            or_(
                and_(models.UserList.created_by_id == user.id, models.AuthUser.id == user.id),
                and_(
                    models.UserList.from_lang == user.from_lang,
                    models.UserList.shared == True,  # noqa: E712
                    models.AuthUser.is_superuser == True,  # noqa: E712
                    models.UserList.created_by_id == models.AuthUser.id,
                ),  # pylint: disable=W0143
            )
        )
        .options(selectinload(models.UserList.created_by))
    )
    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = models.UserList.updated_at > updated_at_datetime
        if not id:
            stmt = stmt.where(base_query)
        else:
            stmt = stmt.where(
                or_(
                    base_query,
                    and_(
                        models.UserList.updated_at == updated_at_datetime,
                        models.UserList.id > id,
                    ),
                )
            )
    query = stmt.order_by("updated_at", "id").limit(limit)
    result = await db.execute(query)
    obj_list = result.scalars().all()
    objs = [Wordlists.from_model(dj_model) for dj_model in obj_list]
    logger.debug(
        f"filter_wordlists finished: {user.id=}, {limit=}, {id=}, {updated_at=}, {Wordlists=}, {models.UserList=}"
    )
    return objs


async def filter_surveys(
    db: AsyncSession,
    from_lang: str,
    to_lang: str,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[CommonType]:
    logger.debug(f"filter_surveys started: {from_lang=}, {to_lang=}, {limit=}, {id=}, {updated_at=}")

    stmt = (
        select(models.Survey)
        .where(
            and_(
                models.Survey.from_lang == from_lang,
                models.Survey.to_lang == to_lang,
                models.AuthUser.is_superuser == True,  # noqa: E712
                models.Survey.created_by_id == models.AuthUser.id,
            )
        )
        .options(selectinload(models.Survey.created_by))
    )

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = models.Survey.updated_at > updated_at_datetime
        if not id:
            stmt = stmt.where(base_query)
        else:
            stmt = stmt.where(
                or_(
                    base_query,
                    and_(
                        models.Survey.updated_at == updated_at_datetime,
                        models.Survey.id > id,
                    ),
                )
            )

    result = await db.execute(stmt.order_by("updated_at", "id").limit(limit))
    obj_list = result.scalars().all()
    objs = [Surveys.from_model(dj_model) for dj_model in obj_list]
    logger.debug(f"filter_survey finished: {from_lang=}, {to_lang=}, {limit=}, {id=}, {updated_at=}")
    return objs


async def filter_teacher_registrations(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[Teacherregistrations]:
    logger.debug(f"filter_teacher_registrations started: {user_id=}, {updated_at=}")
    stmt = (
        select(models.TeacherRegistration)
        .distinct()
        .join(models.LanguageClass)
        .join(models.StudentRegistration)
        .where(
            or_(
                models.TeacherRegistration.user_id == user_id,
                models.StudentRegistration.user_id == user_id,
            )
        )
    )

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = or_(
            # models.AuthUser.updated_at > updated_at_datetime,
            models.TeacherRegistration.updated_at > updated_at_datetime,
            models.StudentRegistration.updated_at > updated_at_datetime,
        )

        if not id:
            stmt = stmt.where(base_query)
        else:
            stmt = stmt.where(
                or_(
                    base_query,
                    and_(
                        models.TeacherRegistration.updated_at == updated_at_datetime,
                        models.TeacherRegistration.id > id,
                    ),
                )
            )

    result = await db.execute(
        stmt.order_by(text("teacherregistration.updated_at"), text("teacherregistration.id")).limit(limit)
    )
    objs = [Teacherregistrations.from_model(dj_model) for dj_model in result.scalars().all()]
    logger.debug(f"filter_teacher_registrations finished: {updated_at=}")
    return objs


async def filter_student_registrations(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[Studentregistrations]:
    logger.debug(f"filter_student_registrations started: {user_id=}, {updated_at=}")
    stmt = (
        select(models.StudentRegistration)
        .distinct()
        .join(models.LanguageClass)
        .join(models.TeacherRegistration)
        .where(
            or_(
                models.TeacherRegistration.user_id == user_id,
                models.StudentRegistration.user_id == user_id,
            )
        )
    )

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = or_(
            # models.AuthUser.updated_at > updated_at_datetime,
            models.TeacherRegistration.updated_at > updated_at_datetime,
            models.StudentRegistration.updated_at > updated_at_datetime,
        )

        if not id:
            stmt = stmt.where(base_query)
        else:
            stmt = stmt.where(
                or_(
                    base_query,
                    and_(
                        models.StudentRegistration.updated_at == updated_at_datetime,
                        models.StudentRegistration.id > id,
                    ),
                )
            )

    result = await db.execute(
        stmt.order_by(text("studentregistration.updated_at"), text("studentregistration.id")).limit(limit)
    )
    objs = [Studentregistrations.from_model(dj_model) for dj_model in result.scalars().all()]
    logger.debug(f"filter_student_registrations finished: {updated_at=}")
    return objs


async def filter_persons(
    db: AsyncSession,
    user_id: int,
    updated_at: Optional[float] = -1,
) -> list[Persons]:
    logger.debug(f"filter_persons started: {user_id=}, {updated_at=}")

    updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc) if updated_at and updated_at > 0 else 0

    user_select = select(models.AuthUser).where(
        and_(
            models.AuthUser.id == user_id,
            models.AuthUser.updated_at > updated_at_datetime if updated_at_datetime else True,
        )
    )
    updated_at_clause = or_(
        models.AuthUser.updated_at > updated_at_datetime,
        models.TeacherRegistration.updated_at > updated_at_datetime,
        models.StudentRegistration.updated_at > updated_at_datetime,
    )

    students_select = (
        select(models.AuthUser)
        .join(models.StudentRegistration, onclause=models.StudentRegistration.user_id == models.AuthUser.id)
        .join(models.LanguageClass)
        .join(models.TeacherRegistration)
        .where(
            and_(
                or_(
                    models.TeacherRegistration.user_id == user_id,
                    models.LanguageClass.created_by_id == user_id,
                ),
                models.AuthUser.id == models.StudentRegistration.user_id,
            ),
        )
    )
    teachers_select = (
        select(models.AuthUser)
        .join(models.StudentRegistration, onclause=models.StudentRegistration.user_id == models.AuthUser.id)
        .join(models.LanguageClass)
        .join(models.TeacherRegistration)
        .where(
            and_(
                models.TeacherRegistration.user_id == models.AuthUser.id,
                models.AuthUser.id == models.StudentRegistration.user_id,
                models.StudentRegistration.user_id == user_id,
            )
        )
    )

    if updated_at and updated_at > 0:
        teachers_select = teachers_select.where(updated_at_clause)
        students_select = students_select.where(updated_at_clause)

    stmt = union(user_select, students_select, teachers_select)
    # print(stmt.compile(compile_kwargs={"literal_binds": True}))
    result = await db.execute(stmt.order_by("updated_at"))
    objs = [Persons.from_model(dj_model) for dj_model in result.all()]
    logger.debug(f"filter_persons finished: {updated_at=}")
    return objs


async def filter_standard(
    db: AsyncSession,
    user_id: int,
    limit: int,
    ref: CommonType,
    model_ref: DetailedMixin,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[CommonType]:

    logger.debug(f"filter_standard started: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=}, {model_ref=}")

    stmt = select(model_ref).where(model_ref.created_by_id == user_id).options(selectinload(model_ref.created_by))

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = model_ref.updated_at > updated_at_datetime
        if not id:
            stmt = stmt.where(base_query)
        else:
            stmt = stmt.where(
                or_(
                    base_query,
                    and_(
                        model_ref.updated_at == updated_at_datetime,
                        model_ref.id > id,
                    ),
                )
            )

    result = await db.execute(stmt.order_by("updated_at", "id").limit(limit))
    obj_list = result.scalars().all()
    objs = [ref.from_model(dj_model) for dj_model in obj_list]
    logger.debug(f"filter_standard finished: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=} , {model_ref=}  ")
    return objs


@strawberry.type
class Query:
    @strawberry.field
    async def hello(info: Info[Context, Any]) -> str:  # pylint: disable=E0213
        return "world"

    @strawberry.field
    async def feed_languageclasses(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Languageclasses]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Languageclasses, models.LanguageClass, id, updated_at)

    @strawberry.field
    async def feed_studentregistrations(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Studentregistrations]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_student_registrations(db, user.id, limit, id, updated_at)

    @strawberry.field
    async def feed_teacherregistrations(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Teacherregistrations]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_teacher_registrations(db, user.id, limit, id, updated_at)
            # return await filter_standard(
            #     db, user.id, limit, Teacherregistrations, models.TeacherRegistration, id, updated_at
            # )

    @strawberry.field
    async def feed_persons(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Persons]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_persons(db, user.id, updated_at)

    @strawberry.field
    async def feed_imports(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Imports]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Imports, models.Import, id, updated_at)

    @strawberry.field
    async def feed_userlists(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Userlists]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Userlists, models.UserList, id, updated_at)

    @strawberry.field
    async def feed_userdictionaries(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Userdictionaries]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Userdictionaries, models.UserDictionary, id, updated_at)

    @strawberry.field
    async def feed_contents(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Contents]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Contents, models.Content, id, updated_at)

    @strawberry.field
    async def feed_goals(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Goals]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Goals, models.Goal, id, updated_at)

    @strawberry.field
    async def feed_usersurveys(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Usersurveys]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Usersurveys, models.UserSurvey, id, updated_at)

    @strawberry.field
    async def feed_characters(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Characters]:
        json_path = latest_character_json_dir_path()
        last_updated = int(os.path.basename(json_path) or 0)
        characters = []
        if last_updated > updated_at:
            for f in os.scandir(latest_character_json_dir_path()):
                if f.is_file() and re.match(HANZI_JSON_CACHE_FILE_REGEX, f.name):
                    with open(f.path) as f:
                        characters += Characters.from_dict(json.load(f), last_updated)
            return characters
        else:
            return []

    @strawberry.field
    async def feed_student_word_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[StudentWordModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
            lang_pair = user.lang_pair
        logger.debug(f"Getting word model stats query: {user_id=}, {limit=}, {id=}, {updated_at=}, {lang_pair=}")
        if settings.DEBUG:
            async with async_session() as db:
                await ensure_cache_preloaded(db, get_from_lang(lang_pair), get_to_lang(lang_pair))

        return await filter_student_word_model_stats(user_id, lang_pair, limit, int(id) if id else 0, updated_at)

    @strawberry.field
    async def feed_word_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[WordModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
            lang_pair = user.lang_pair
        logger.debug(f"Getting word model stats query: {user_id=}, {limit=}, {id=}, {updated_at=}, {lang_pair=}")
        if settings.DEBUG:
            async with async_session() as db:
                await ensure_cache_preloaded(db, get_from_lang(lang_pair), get_to_lang(lang_pair))

        return await filter_word_model_stats(user_id, lang_pair, limit, int(id) if id else 0, updated_at)

    @strawberry.field
    async def feed_day_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[DayModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id

        return await filter_day_model_stats(user_id, limit, updated_at)

    @strawberry.field
    async def feed_student_day_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[StudentDayModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id

        return await filter_student_day_model_stats(user_id, limit, updated_at)

    @strawberry.field
    async def feed_wordlists(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Wordlists]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_wordlists(db, user, limit, id, updated_at)

    @strawberry.field
    async def feed_cards(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Cards]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_cards(db, user.id, limit, id, updated_at)

    @strawberry.field
    async def feed_recentsentences(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Recentsentences]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_recentsentences(db, user.id, limit, id, updated_at)

    @strawberry.field
    async def feed_definitions(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Definitions]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_cached_definitions(db, user, limit, id, updated_at)

    @strawberry.field
    async def feed_surveys(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> list[Surveys]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)  # raises exception if no logged in user
            objs = await filter_surveys(db, user.from_lang, user.to_lang, limit, id, updated_at)
            for obj in objs:
                obj.survey_json = json.dumps(obj.survey_json)
            return objs


async def get_user(db: AsyncSession, request: Request) -> models.AuthUser:
    try:
        user = await deps.get_current_good_user(db=db, token=await deps.reusable_oauth2(request))
    except HTTPException as ex:
        raise Exception(f'{{"statusCode":"{ex.status_code}","detail":"{ex.detail}"}}') from ex
    if not user:
        raise Exception(f'{{"statusCode":"{status.HTTP_403_FORBIDDEN}","detail":"No valid user credentials provided"}}')
    return user


def get_user_id_from_token(token: str) -> int:
    try:
        user_id = deps.get_current_good_tokenpayload(token).id

    except HTTPException as ex:
        raise Exception(f'{{"statusCode":"{ex.status_code}","detail":"{ex.detail}"}}') from ex
    except Exception as e:
        logger.error(e)
        raise
    return user_id


def fill_import(dj_obj: models.Import, obj: ImportsInput, _user: models.AuthUser = None):
    dj_obj.processing = obj.processing
    dj_obj.process_type = obj.process_type
    dj_obj.import_file = obj.import_file
    dj_obj.analysis = obj.analysis
    dj_obj.shared = obj.shared


def fill_goal(dj_obj: models.Goal, obj: GoalsInput, _user: models.AuthUser = None):
    if obj.parent:
        dj_obj.parent_id = obj.parent
    dj_obj.priority = obj.priority
    dj_obj.user_list_id = obj.user_list


def fill_user_list(dj_obj: models.UserList, obj: UserlistsInput, user: models.AuthUser = None):
    if user and user.from_lang:
        dj_obj.from_lang = user.from_lang
    dj_obj.processing = obj.processing
    dj_obj.the_import_id = obj.the_import
    dj_obj.minimum_doc_frequency = obj.minimum_doc_frequency
    dj_obj.minimum_abs_frequency = obj.minimum_abs_frequency
    dj_obj.order_by = obj.order_by
    dj_obj.nb_to_take = obj.nb_to_take
    dj_obj.shared = obj.shared
    dj_obj.words_are_known = obj.words_are_known
    dj_obj.word_knowledge = obj.word_knowledge
    dj_obj.only_dictionary_words = obj.only_dictionary_words


def fill_userdictionary(dj_obj: models.UserDictionary, obj: UserdictionariesInput, _user: models.AuthUser = None):
    dj_obj.lz_content = obj.lz_content
    dj_obj.processing = obj.processing
    dj_obj.from_lang = obj.from_lang
    dj_obj.to_lang = obj.to_lang
    dj_obj.shared = obj.shared


def fill_content(dj_obj: models.Content, obj: ContentsInput, _user: models.AuthUser = None):
    dj_obj.processing = obj.processing
    dj_obj.the_import_id = obj.the_import
    dj_obj.content_type = obj.content_type
    dj_obj.author = obj.author
    dj_obj.cover = obj.cover
    dj_obj.language = obj.lang
    dj_obj.shared = obj.shared


def fill_user_survey(dj_obj: models.UserSurvey, obj: UsersurveysInput, _user: models.AuthUser = None):
    dj_obj.survey_id = obj.survey_id
    dj_obj.data = obj.data


async def get_object(db: AsyncSession, model_ref: type[Base], id: str, user: AuthUser):
    stmt = select(model_ref).where(model_ref.id == id, model_ref.created_by == user)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def set_registrations(
    objs: list[CommonType],
    model_ref: type[Base],
    info: Info[Context, Any],
    channel: str,
    ref: type[CommonType],
):
    obj = objs
    logger.debug(f"The info is: {info=}, and the channel {ref.__name__=} is: {obj=}")
    async with async_session() as db:
        user = await get_user(db, info.context.request)
        publish_to = set([int(user.id)])
        obj_unities = []
        tup = tuple_(model_ref.user_id, model_ref.class_id)
        for o in obj:
            if int(o.created_by) != int(user.id) and int(o.user_id) != int(user.id):
                raise HTTPException(status_code=403, detail=f"You are not allowed to edit this object {o.id}!")
            publish_to.add(int(o.user_id))
            obj_unities.append(
                (
                    int(o.user_id),
                    o.class_id,
                )
            )

        result = await db.execute(select(model_ref).where(tup.in_(obj_unities)))
        some_objs = {}
        for dj_obj in result.scalars().all():
            some_objs[
                (
                    dj_obj.user_id,
                    str(dj_obj.class_id),
                )
            ] = dj_obj

        for o in obj:
            class_id = str(o.class_id)
            user_id = int(o.user_id)
            if (
                user_id,
                class_id,
            ) in some_objs:
                dj_obj = some_objs[
                    (
                        user_id,
                        class_id,
                    )
                ]
            else:
                await db.rollback()
                raise HTTPException(
                    status_code=403, detail=f"You are not allowed to create objects using this API {o.id}!"
                )

            fill_common(dj_obj, o)
            db.add(dj_obj)
        try:
            await db.commit()
        except Exception as e:
            logger.exception(f"Error saving updated registration: {json.dumps(dataclasses.asdict(o))}")
            logger.error(e)
            raise
        result = await db.execute(select(model_ref).where(tup.in_(obj_unities)).order_by("updated_at"))
        pubs = [ref.from_model(obj) for obj in result.scalars().all()]
        for user_id in publish_to:
            await publish_message(channel, pubs, info.context.broadcast, user_id=user_id)
        return pubs


async def set_objects(
    objs: list[CommonType],
    model_ref: type[Base],
    info: Info[Context, Any],
    channel: str,
    ref: type[CommonType],
    fill_object: Callable[[Base, CommonType, models.AuthUser], None] = None,
):
    async with async_session() as db:
        user = await get_user(db, info.context.request)
        tup = tuple_(model_ref.created_by_id, model_ref.id)
        obj_unities = []
        for obj in objs:
            obj_unities.append(
                (
                    int(user.id),
                    str(obj.id),
                )
            )
        stmt = select(model_ref).where(tup.in_(obj_unities))
        result = await db.execute(stmt)
        some_objs = {}
        for dj_obj in result.scalars().all():
            some_objs[
                (
                    int(user.id),
                    str(dj_obj.id),
                )
            ] = dj_obj
        for obj in objs:
            if (
                int(user.id),
                str(obj.id),
            ) in some_objs:
                dj_obj = some_objs[
                    (
                        user.id,
                        obj.id,
                    )
                ]
            else:
                dj_obj = model_ref(id=obj.id, created_by=user, updated_by=user)

            fill_common(dj_obj, obj)
            if fill_object:
                fill_object(dj_obj, obj, user)
            db.add(dj_obj)
        try:
            await db.commit()
        except Exception as e:
            logger.exception(f"Error saving updated obj: {json.dumps(dataclasses.asdict(obj))}")
            logger.error(e)
            raise

        result = await db.execute(select(model_ref).where(tup.in_(obj_unities)).order_by("updated_at"))
        pubs = [ref.from_model(obj) for obj in result.scalars().all()]
        await publish_message(channel, pubs, info.context.broadcast, user)
        return pubs


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def set_cards(
        self, info: Info[Context, Any], cards: Optional[list[Optional[CardsInput]]] = None
    ) -> list[Cards]:
        logger.debug(f"The info is: {info=}, and the cards are: {cards=}")
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            card_unities = []
            tup = tuple_(models.Card.user_id, models.Card.card_type, models.Card.word_id)
            for card in cards:
                word_id, card_type = map(int, card.id.split("-"))
                card_unities.append((user.id, card_type, word_id))

            result = await db.execute(
                select(models.Card).where(tup.in_(card_unities)).options(selectinload(models.Card.user))
            )
            some_objs = {}
            for dj_obj in result.scalars().all():
                some_objs[
                    (
                        dj_obj.user_id,
                        dj_obj.card_type,
                        dj_obj.word_id,
                    )
                ] = dj_obj

            for card in cards:
                word_id, card_type = map(int, card.id.split("-"))
                if (
                    user.id,
                    card_type,
                    word_id,
                ) in some_objs:
                    dj_card = some_objs[
                        (
                            user.id,
                            card_type,
                            word_id,
                        )
                    ]
                else:
                    dj_card = models.Card(user=user, card_type=card_type, word_id=word_id)

                if card.due_date:
                    dj_card.due_date = datetime.fromtimestamp(card.due_date, pytz.utc)
                if card.first_revision_date:
                    dj_card.first_revision_date = datetime.fromtimestamp(card.first_revision_date, pytz.utc)
                if card.last_revision_date:
                    dj_card.last_revision_date = datetime.fromtimestamp(card.last_revision_date, pytz.utc)
                if card.first_success_date:
                    dj_card.first_success_date = datetime.fromtimestamp(card.first_success_date, pytz.utc)

                dj_card.interval = card.interval
                dj_card.repetition = card.repetition
                dj_card.efactor = card.efactor
                dj_card.front = card.front
                dj_card.back = card.back
                dj_card.known = card.known
                dj_card.suspended = card.suspended
                # FIXME: does this get done automatically???
                # dj_card.updated_at = datetime.now(pytz.utc)  # int(time.time())  # time_ns()? something else?
                dj_card.deleted = card.deleted
                db.add(dj_card)

            try:
                await db.commit()
            except Exception as e:
                logger.exception(f"Error saving updated card: {json.dumps(dataclasses.asdict(cards))}")
                logger.error(e)
                raise

            result = await db.execute(
                select(models.Card)
                .where(tup.in_(card_unities))
                .order_by("updated_at")
                .options(selectinload(models.Card.user))
            )
            return_vals = [Cards.from_model(dj_card) for dj_card in result.scalars().all()]

            await publish_message(models.Card.__name__, return_vals, info.context.broadcast, user)
            return return_vals

    @strawberry.mutation
    async def set_imports(
        self,
        info: Info[Context, Any],
        imports: Optional[list[Optional[ImportsInput]]] = None,
    ) -> list[Imports]:
        obj = imports
        logger.debug(f"The info is: {info=}, and the channel {Imports.__name__=} is: {obj=}")
        return await set_objects(obj, models.Import, info, models.Import.__name__, Imports, fill_import)

    @strawberry.mutation
    async def set_languageclasses(
        self,
        info: Info[Context, Any],
        languageclasses: Optional[list[Optional[LanguageclassesInput]]] = None,
    ) -> list[Languageclasses]:
        obj = languageclasses
        logger.debug(f"The info is: {info=}, and the channel {Languageclasses.__name__=} is: {obj=}")
        return await set_objects(obj, models.LanguageClass, info, models.LanguageClass.__name__, Languageclasses)

    @strawberry.mutation
    async def set_contents(
        self, info: Info[Context, Any], contents: Optional[list[Optional[ContentsInput]]] = None
    ) -> list[Contents]:
        obj = contents
        logger.debug(f"The info is: {info=}, and the channel {Contents.__name__=} is: {obj=}")
        content_list: list[Contents] = await set_objects(
            obj, models.Content, info, models.Content.__name__, Contents, fill_content
        )
        for content in content_list:
            if content.processing == REQUESTED:
                await content_process_topic.send(value=ProcessData(type="content", id=content.id))
        return content_list

    @strawberry.mutation
    async def set_userlists(
        self, info: Info[Context, Any], userlists: Optional[list[Optional[UserlistsInput]]] = None
    ) -> list[Userlists]:
        obj = userlists
        logger.debug(f"The info is: {info=}, and the channel {Userlists.__name__=} is: {obj=}")
        ulists: list[Userlists] = await set_objects(
            obj, models.UserList, info, models.UserList.__name__, Userlists, fill_user_list
        )
        for ulist in ulists:
            if ulist.processing == REQUESTED:
                await list_process_topic.send(value=ProcessData(type="list", id=ulist.id))
        return ulists

    @strawberry.mutation
    async def set_recentsentences(
        self, info: Info[Context, Any], recentsentences: Optional[list[Optional[RecentsentencesInput]]] = None
    ) -> list[Recentsentences]:
        objs = recentsentences
        logger.debug(f"The info is: {info=}, and the channel {Recentsentences.__name__=} is: {objs=}")

        async with async_session() as db:
            user = await get_user(db, info.context.request)

            obj_unities = []
            tup = tuple_(models.UserRecentSentences.user_id, models.UserRecentSentences.word_id)
            for obj in objs:
                obj_unities.append((user.id, int(obj.id)))

            result = await db.execute(
                select(models.UserRecentSentences)
                .where(tup.in_(obj_unities))
                .options(selectinload(models.UserRecentSentences.user))
            )
            some_objs = {}
            for dj_obj in result.scalars().all():
                some_objs[
                    (
                        dj_obj.user_id,
                        dj_obj.word_id,
                    )
                ] = dj_obj

            for obj in objs:
                word_id = int(obj.id)
                if (
                    user.id,
                    word_id,
                ) in some_objs:
                    dj_obj = some_objs[
                        (
                            user.id,
                            word_id,
                        )
                    ]
                else:
                    dj_obj = models.UserRecentSentences(word_id=word_id, user=user)
                dj_obj.lz_content = obj.lz_content
                dj_obj.deleted = obj.deleted
                db.add(dj_obj)
            try:
                await db.commit()
            except Exception as e:
                logger.exception(f"Error saving updated recentsentence: {json.dumps(dataclasses.asdict(obj))}")
                logger.error(e)
                raise

            result = await db.execute(
                select(models.UserRecentSentences)
                .where(tup.in_(obj_unities))
                .order_by("updated_at")
                .options(selectinload(models.UserRecentSentences.user))
            )
            return_vals = [Recentsentences.from_model(dj_obj) for dj_obj in result.scalars().all()]
            await publish_message(models.UserRecentSentences.__name__, return_vals, info.context.broadcast, user)
            return return_vals

    @strawberry.mutation
    async def set_userdictionaries(
        self, info: Info[Context, Any], userdictionaries: Optional[list[Optional[UserdictionariesInput]]] = None
    ) -> list[Userdictionaries]:
        obj = userdictionaries
        logger.debug(f"The info is: {info=}, and the channel {Userdictionaries.__name__=} is: {obj=}")
        userdictionaries: list[Userdictionaries] = await set_objects(
            obj, models.UserDictionary, info, models.UserDictionary.__name__, Userdictionaries, fill_userdictionary
        )
        return userdictionaries

    @strawberry.mutation
    async def set_studentregistrations(
        self, info: Info[Context, Any], studentregistrations: Optional[list[Optional[StudentregistrationsInput]]] = None
    ) -> list[Studentregistrations]:
        obj = studentregistrations
        logger.debug(f"The info is: {info=}, and the channel {Studentregistrations.__name__=} is: {obj=}")
        return await set_registrations(
            obj, models.StudentRegistration, info, models.StudentRegistration.__name__, Studentregistrations
        )

    @strawberry.mutation
    async def set_teacherregistrations(
        self, info: Info[Context, Any], teacherregistrations: Optional[list[Optional[TeacherregistrationsInput]]] = None
    ) -> list[Teacherregistrations]:
        obj = teacherregistrations
        logger.debug(f"The info is: {info=}, and the channel {Teacherregistrations.__name__=} is: {obj=}")
        return await set_registrations(
            obj, models.TeacherRegistration, info, Teacherregistrations.__name__, Teacherregistrations
        )

    @strawberry.mutation
    async def set_goals(
        self, info: Info[Context, Any], goals: Optional[list[Optional[GoalsInput]]] = None
    ) -> list[Goals]:
        obj = goals
        logger.debug(f"The info is: {info=}, and the channel {Goals.__name__=} is: {obj=}")
        return await set_objects(obj, models.Goal, info, models.Goal.__name__, Goals, fill_goal)

    @strawberry.mutation
    async def set_usersurveys(
        self, info: Info[Context, Any], usersurveys: Optional[list[Optional[UsersurveysInput]]] = None
    ) -> list[Usersurveys]:
        obj = usersurveys
        logger.debug(f"The info is: {info=}, and the channel {Usersurveys.__name__=} is: {obj=}")
        return await set_objects(
            obj, models.UserSurvey, info, models.UserSurvey.__name__, Usersurveys, fill_user_survey
        )


async def changed_standard(info: Info[Context, Any], token: str, ref: type[Base]) -> list[CommonType]:
    user_id = get_user_id_from_token(token)
    logger.debug("Setting up %ss subscription for user %s", ref.__name__, user_id)
    async with info.context.broadcast.subscribe(channel=ref.__name__) as subscriber:
        async for event in subscriber:
            if clean_broadcaster_string(event.message) == str(user_id):
                logger.debug(f"Got a {ref.__name__} subscription event for {event.message}")
                yield ref(id="42")


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def changed_cards(self, info: Info[Context, Any], token: str) -> Cards:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up models.Card.__name__ subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel=models.Card.__name__) as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a models.Card.__name__ subscription event for {user_id}")
                    yield Cards(id="42")

    @strawberry.subscription
    async def changed_daymodelstats(self, info: Info[Context, Any], token: str) -> DayModelStats:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up stats.UserDay.__name__ subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel=stats.UserDay.__name__) as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a stats.UserDay.__name__ subscription event for {user_id}")
                    yield DayModelStats(id="42")

    @strawberry.subscription
    async def changed_wordmodelstats(self, info: Info[Context, Any], token: str) -> WordModelStats:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up stats.UserWord.__name__ subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel=stats.UserWord.__name__) as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a stats.UserWord.__name__ subscription event for {user_id}")
                    yield WordModelStats(id="42")

    @strawberry.subscription
    async def changed_wordlists(self, info: Info[Context, Any], token: str) -> Wordlists:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up WordList subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel="WordList") as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a WordList subscription event for {user_id}")
                    yield Wordlists(id="42", name="tmol", word_ids=["42"])

    @strawberry.subscription
    async def changed_definitions(self, info: Info[Context, Any], token: str) -> Definitions:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up models.CachedDefinition.__name__ subscription for user %s", user_id)

        async with info.context.broadcast.subscribe(channel=models.CachedDefinition.__name__) as subscriber:
            async for event in subscriber:
                logger.debug(f"Got a models.CachedDefinition.__name__ subscription event for {event.message}")
                yield Definitions(id="42", graph="四十二", sound=["42"])

    @strawberry.subscription
    async def changed_persons(self, info: Info[Context, Any], token: str) -> Persons:
        return changed_standard(info, token, models.AuthUser)

    @strawberry.subscription
    async def changed_languageclasses(self, info: Info[Context, Any], token: str) -> Languageclasses:
        return changed_standard(info, token, models.LanguageClass)

    @strawberry.subscription
    async def changed_teacherregistrations(self, info: Info[Context, Any], token: str) -> Teacherregistrations:
        return changed_standard(info, token, models.TeacherRegistration)

    @strawberry.subscription
    async def changed_studentregistrations(self, info: Info[Context, Any], token: str) -> Studentregistrations:
        return changed_standard(info, token, models.StudentRegistration)

    @strawberry.subscription
    async def changed_imports(self, info: Info[Context, Any], token: str) -> Imports:
        return changed_standard(info, token, models.Import)

    @strawberry.subscription
    async def changed_recentsentences(self, info: Info[Context, Any], token: str) -> Recentsentences:
        return changed_standard(info, token, models.UserRecentSentences)

    @strawberry.subscription
    async def changed_goals(self, info: Info[Context, Any], token: str) -> Goals:
        return changed_standard(info, token, models.Goal)

    @strawberry.subscription
    async def changed_contents(self, info: Info[Context, Any], token: str) -> Contents:
        return changed_standard(info, token, models.Content)

    @strawberry.subscription
    async def changed_userlists(self, info: Info[Context, Any], token: str) -> Userlists:
        return changed_standard(info, token, models.UserList)

    @strawberry.subscription
    async def changed_usersurveys(self, info: Info[Context, Any], token: str) -> Usersurveys:
        return changed_standard(info, token, models.UserSurvey)

    @strawberry.subscription
    async def changed_userdictionaries(self, info: Info[Context, Any], token: str) -> Userdictionaries:
        return changed_standard(info, token, models.UserDictionary)


EXPIRED_MESSAGE = '{"statusCode":"401","detail":"token_signature_has_expired"}'


class TCSchema(strawberry.Schema):
    def process_errors(
        self,
        errors: list[GraphQLError],
        execution_context: Optional[ExecutionContext] = None,
    ) -> None:
        for error in errors:
            if isinstance(error, GraphQLError) and error.message == EXPIRED_MESSAGE:
                # This is very normal, so we don't want to log it other than debug.
                logger.debug(error.message)
            else:
                StrawberryLogger.error(error, execution_context)


schema = TCSchema(query=Query, mutation=Mutation, subscription=Subscription)
