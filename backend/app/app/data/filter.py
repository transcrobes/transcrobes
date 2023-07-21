# -*- coding: utf-8 -*-
import logging
import os
from datetime import datetime

import pytz
from app import models
from app.api import deps
from app.api.api_v1 import types
from app.cache import MissingCacheValueException, add_word_ids, cached_definitions
from app.core.config import settings
from app.db.session import async_session, async_stats_session
from app.enrich import latest_definitions_json_dir_path
from app.enrich.data import managers
from app.enrich.models import ensure_cache_preloaded, update_cache
from app.etypes import LANG_PAIR_SEPARATOR
from app.models import stats
from app.models.mixins import ActivatorMixin, DetailedMixin
from app.ndutils import get_from_lang, get_to_lang
from fastapi import HTTPException, Request, status
from sqlalchemy import and_, or_, select, text
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


async def get_user(db: AsyncSession, request: Request) -> models.AuthUser:
    try:
        user = await deps.get_current_good_user(db=db, token=await deps.reusable_oauth2(request))
    except HTTPException as ex:
        raise Exception(f'{{"statusCode":"{ex.status_code}","detail":"{ex.detail}"}}') from ex
    if not user:
        raise Exception(f'{{"statusCode":"{status.HTTP_403_FORBIDDEN}","detail":"No valid user credentials provided"}}')
    return user


def construct_return(objs):
    return types.Return(
        documents=objs,
        checkpoint=types.Checkpoint(
            id=objs[-1].id if len(objs) > 0 else "", updated_at=objs[-1].updated_at if len(objs) > 0 else -1
        ),
    )


async def filter_word_model_stats(
    user_id: int,
    lang_pair: str,
    limit: int,
    id: str | None = "",
    updated_at: float | None = -1,
) -> list[types.WordModelStats]:
    if settings.DEBUG:
        async with async_session() as db:
            await ensure_cache_preloaded(db, get_from_lang(lang_pair), get_to_lang(lang_pair))

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
        logger.error("Missing cache value, updating cache", len(cached_definitions[lang_pair].values()))
        async with async_session() as db:
            if cached_definitions and cached_definitions[lang_pair] and len(cached_definitions[lang_pair].values()) > 0:
                cached_max_timestamp = next(reversed(cached_definitions[lang_pair].values()))[0]
            else:
                cached_max_timestamp = 0
            await update_cache(db, get_from_lang(lang_pair), get_to_lang(lang_pair), cached_max_timestamp)
        updates = add_word_ids(lines, lang_pair)

    updates = [
        user_word
        for user_word in sorted(updates, key=lambda k: (k[7], k[8]))
        if user_word[7] > updated_at or int(user_word[8]) > int(id)
    ]
    if limit > 0:
        updates = updates[:limit]
    logger.debug(f"filter_word_model_stats finished: {user_id=}, {limit=}, {id=}, {updated_at=}")
    return [types.WordModelStats.from_list(user_word) for user_word in updates]


async def filter_day_model_stats(
    user_id: int,
    limit: int,
    updated_at: float = 0,
) -> list[types.DayModelStats]:
    logger.debug(f"filter_day_model_stats started: {user_id=}, {limit=}, {updated_at=}")

    stmt = select(stats.UserDay).where(stats.UserDay.user_id == user_id)
    updated_at = updated_at or 0
    if updated_at > 0:
        base_query = stats.UserDay.updated_at > updated_at
        stmt = stmt.where(base_query)

    async with async_stats_session() as db:
        result = await db.execute(stmt.order_by("updated_at", "day").limit(limit))
        obj_list = result.scalars().all()
        objs = [types.DayModelStats.from_model(user_day) for user_day in obj_list]

        logger.debug(f"filter_day_model_stats finished: {user_id=}, {limit=} {updated_at=}")
    return objs


async def filter_student_day_model_stats(
    user_id: int,
    limit: int,
    updated_at: float = 0,
) -> list[types.StudentDayModelStats]:
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
                models.StudentRegistration.deleted.is_(False),
                models.TeacherRegistration.deleted.is_(False),
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
    objs = [types.StudentDayModelStats.from_model(user_day) for user_day in obj_list]

    logger.debug(f"filter_student_day_model_stats finished: {user_id=}, {limit=} {updated_at=}")
    return objs


async def filter_student_word_model_stats(
    user_id: int,
    lang_pair: str,
    limit: int,
    id: str | None = "",
    updated_at: float | None = -1,
) -> list[types.StudentWordModelStats]:
    if settings.DEBUG:
        async with async_session() as db:
            await ensure_cache_preloaded(db, get_from_lang(lang_pair), get_to_lang(lang_pair))

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
                models.StudentRegistration.deleted.is_(False),
                models.TeacherRegistration.deleted.is_(False),
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
    logger.debug(f"filter_student_word_model_stats finished: {user_id=}, {limit=}, {id=}, {updated_at=}")
    return [types.StudentWordModelStats.from_list(user_word) for user_word in updates]


async def filter_surveys(
    db: AsyncSession,
    from_lang: str,
    to_lang: str,
    limit: int,
    id: str | None = "",
    updated_at: float | None = -1,
) -> list[types.Surveys]:
    logger.debug(f"filter_surveys started: {from_lang=}, {to_lang=}, {limit=}, {id=}, {updated_at=}")

    stmt = (
        select(models.Survey)
        .where(
            and_(
                models.Survey.from_lang == from_lang,
                models.Survey.to_lang == to_lang,
                models.AuthUser.is_superuser.is_(True),
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
    objs = [types.Surveys.from_model(dj_model) for dj_model in obj_list]
    logger.debug(f"filter_survey finished: {from_lang=}, {to_lang=}, {limit=}, {id=}, {updated_at=}")
    return objs


async def filter_cards(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: str | None = "",
    updated_at: float | None = -1,
) -> list[types.Cards]:
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
    card_list = [types.Cards.from_model(dj_card) for dj_card in model_list]
    return card_list


async def get_standard_rows(
    db: AsyncSession,
    user_id: int,
    limit: int,
    ref: types.CommonType,
    model_ref: DetailedMixin,
    id: str | None = "",
    updated_at: float | None = -1,
):
    logger.debug(f"get_standard_rows started: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=}, {model_ref=}")

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
    return obj_list


async def filter_standard(
    db: AsyncSession,
    user_id: int,
    limit: int,
    ref: types.CommonType,
    model_ref: DetailedMixin,
    id: str | None = "",
    updated_at: float | None = -1,
):
    logger.debug(f"filter_standard started: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=}, {model_ref=}")
    obj_list = await get_standard_rows(db, user_id, limit, ref, model_ref, id, updated_at)
    objs = [ref.from_model(dj_model) for dj_model in obj_list]
    logger.debug(f"filter_standard finished: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=} , {model_ref=}  ")
    return construct_return(objs)


async def filter_wordlists(
    db: AsyncSession,
    user_id: int,
    from_lang: str,
    limit: int,
    id: str | None = "",
    updated_at: float | None = -1,
) -> list[types.CommonType]:
    logger.debug(f"filter_wordlists started: {user_id=}, {limit=}, {id=}, {updated_at=}")

    stmt = (
        select(models.UserList)
        .where(
            or_(
                and_(models.UserList.created_by_id == user_id, models.AuthUser.id == user_id),
                and_(
                    models.UserList.from_lang == from_lang,
                    models.UserList.shared.is_(True),
                    models.AuthUser.is_superuser.is_(True),
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
    objs = [await types.Wordlists.from_model(dj_model) for dj_model in obj_list]
    logger.debug(
        f"filter_wordlists finished: {user_id=}, {limit=}, {id=}, {updated_at=}, {types.Wordlists=}, {models.UserList=}"
    )
    return objs


async def filter_cached_definitions(
    db: AsyncSession,
    user: models.AuthUser,
    limit: int,
    id: str | None = "",
    updated_at: float | None = -1,
) -> list[types.Definitions]:
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
            return [types.Definitions.from_model(result.scalar_one(), providers)]
        except Exception:
            logger.exception(
                f"Error getting DefinitionSet for {str(stmt)=}, {latest_cached_date=}, {latest_word_id=},"
                f" {user.from_lang=}, {user.to_lang=}"
            )
            raise

    updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
    if not id:
        stmt = stmt.where(models.CachedDefinition.cached_date > updated_at_datetime)
    else:
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
        defs = [types.Definitions.from_model(word, providers) for word in result.scalars().all()]
    except Exception:
        logger.exception(f"Error getting DefinitionSet for {stmt=}")
        raise
    return defs
