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
    CollectionChanged,
    CommonType,
    Contents,
    ContentsInput,
    DayModelStats,
    Definitions,
    Goals,
    GoalsInput,
    Imports,
    ImportsInput,
    InputCheckpoint,
    Languageclasses,
    LanguageclassesInput,
    Persons,
    PushRow,
    Questionanswers,
    QuestionanswersInput,
    Recentsentences,
    RecentsentencesInput,
    Return,
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
from app.core.config import settings
from app.data.context import Context
from app.data.filter import (
    construct_return,
    filter_cached_definitions,
    filter_cards,
    filter_day_model_stats,
    filter_standard,
    filter_student_day_model_stats,
    filter_student_word_model_stats,
    filter_surveys,
    filter_word_model_stats,
    filter_wordlists,
    get_user,
)
from app.data.models import REQUESTED
from app.db.base_class import Base
from app.db.session import async_session, async_stats_session
from app.enrich import HANZI_JSON_CACHE_FILE_REGEX, latest_character_json_dir_path
from app.enrich.models import ensure_cache_preloaded
from app.models.user import AuthUser
from app.ndutils import clean_broadcaster_string, get_from_lang, get_to_lang
from app.schemas.files import ProcessData
from app.worker.faustus import content_process_topic, list_process_topic
from fastapi.exceptions import HTTPException
from graphql import GraphQLError
from sqlalchemy import tuple_
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import and_, or_, select, text, union
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


async def filter_language_classes(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> list[Languageclasses]:
    logger.debug(f"filter_language_classes started: {user_id=}, {updated_at=}")
    stmt = (
        select(models.LanguageClass)
        .distinct()
        .join(models.TeacherRegistration, isouter=True)
        .join(models.StudentRegistration, isouter=True)
        .where(
            or_(
                models.TeacherRegistration.user_id == user_id,
                models.StudentRegistration.user_id == user_id,
                models.LanguageClass.created_by_id == user_id,
            )
        )
    )

    if updated_at and updated_at > 0:
        updated_at_datetime = datetime.fromtimestamp(updated_at, pytz.utc)
        base_query = or_(
            models.TeacherRegistration.updated_at > updated_at_datetime,
            models.StudentRegistration.updated_at > updated_at_datetime,
            models.LanguageClass.updated_at > updated_at_datetime,
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
    stmt = stmt.order_by(text("languageclass.updated_at"), text("languageclass.id")).limit(limit)
    # print("Languageclasses graphql query",  str(stmt))
    result = await db.execute(stmt)
    objs = [Languageclasses.from_model(dj_model) for dj_model in result.scalars().all()]
    logger.debug(f"filter_language_classes finished: {updated_at=}")
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
            or_(
                models.TeacherRegistration.user_id == user_id,
                models.LanguageClass.created_by_id == user_id,
            ),
        )
    )
    teachers_select = (
        select(models.AuthUser)
        .join(models.TeacherRegistration, onclause=models.TeacherRegistration.user_id == models.AuthUser.id)
        .join(models.LanguageClass)
        .join(models.StudentRegistration)
        .where(
            and_(
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


@strawberry.type
class Query:
    @strawberry.field
    async def hello(info: Info[Context, Any]) -> str:  # pylint: disable=E0213
        return "world"

    @strawberry.field
    async def pull_languageclasses(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Languageclasses]] = None,
    ) -> Return[Languageclasses]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_language_classes(
                    db, user.id, limit, checkpoint.id if checkpoint else "", checkpoint.updated_at if checkpoint else -1
                )
            )

    @strawberry.field
    async def pull_studentregistrations(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Studentregistrations]] = None,
    ) -> Return[Studentregistrations]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_student_registrations(
                    db, user.id, limit, checkpoint.id if checkpoint else "", checkpoint.updated_at if checkpoint else -1
                )
            )

    @strawberry.field
    async def pull_teacherregistrations(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Teacherregistrations]] = None,
    ) -> Return[Teacherregistrations]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_teacher_registrations(
                    db, user.id, limit, checkpoint.id if checkpoint else "", checkpoint.updated_at if checkpoint else -1
                )
            )

    @strawberry.field
    async def pull_persons(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Persons]] = None,
    ) -> Return[Persons]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(await filter_persons(db, user.id, checkpoint.updated_at if checkpoint else -1))

    @strawberry.field
    async def pull_imports(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Imports]] = None,
    ) -> Return[Imports]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Imports,
                models.Import,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_userlists(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Userlists]] = None,
    ) -> Return[Userlists]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Userlists,
                models.UserList,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_userdictionaries(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Userdictionaries]] = None,
    ) -> Return[Userdictionaries]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Userdictionaries,
                models.UserDictionary,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_contents(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Contents]] = None,
    ) -> Return[Contents]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Contents,
                models.Content,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_goals(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Goals]] = None,
    ) -> Return[Goals]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Goals,
                models.Goal,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_questionanswers(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Questionanswers]] = None,
    ) -> Return[Questionanswers]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Questionanswers,
                models.QuestionAnswer,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_usersurveys(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Usersurveys]] = None,
    ) -> Return[Usersurveys]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(
                db,
                user.id,
                limit,
                Usersurveys,
                models.UserSurvey,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )

    @strawberry.field
    async def pull_characters(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Characters]] = None,
    ) -> Return[Characters]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)

        objs = []
        # FIXME: this should work with all potential char languages
        if user.from_lang == "zh-Hans":
            json_path = latest_character_json_dir_path()
            last_updated = int(os.path.basename(json_path) or 0)
            if last_updated > checkpoint.updated_at if checkpoint else -1:
                for f in os.scandir(latest_character_json_dir_path()):
                    if f.is_file() and re.match(HANZI_JSON_CACHE_FILE_REGEX, f.name):
                        with open(f.path) as f:
                            objs += Characters.from_dict(json.load(f), last_updated)

        return construct_return(objs)

    @strawberry.field
    async def pull_student_word_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[StudentWordModelStats]] = None,
    ) -> Return[StudentWordModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
            lang_pair = user.lang_pair
        updated_at = checkpoint.updated_at if checkpoint else -1
        # FIXME: is this the student_id or word_id???
        student_id = int(checkpoint.id) if checkpoint and checkpoint.id else 0

        logger.debug(
            f"Getting word model stats query: {user_id=}, {limit=}, {student_id=}, {updated_at=}, {lang_pair=}"
        )

        if settings.DEBUG:
            async with async_session() as db:
                await ensure_cache_preloaded(db, get_from_lang(lang_pair), get_to_lang(lang_pair))

        return construct_return(
            await filter_student_word_model_stats(user_id, lang_pair, limit, student_id, updated_at)
        )

    @strawberry.field
    async def pull_word_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[WordModelStats]] = None,
    ) -> Return[WordModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
            lang_pair = user.lang_pair
        updated_at = checkpoint.updated_at if checkpoint else -1
        word_id = int(checkpoint.id) if checkpoint and checkpoint.id else 0

        logger.debug(f"Getting word model stats query: {user_id=}, {limit=}, {word_id=}, {updated_at=}, {lang_pair=}")

        if settings.DEBUG:
            async with async_session() as db:
                await ensure_cache_preloaded(db, get_from_lang(lang_pair), get_to_lang(lang_pair))

        async with async_stats_session() as db:
            return construct_return(await filter_word_model_stats(user_id, lang_pair, limit, word_id, updated_at))

    @strawberry.field
    async def pull_day_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[DayModelStats]] = None,
    ) -> Return[DayModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
        return construct_return(
            await filter_day_model_stats(user_id, limit, checkpoint.updated_at if checkpoint else -1)
        )

    @strawberry.field
    async def pull_student_day_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[StudentDayModelStats]] = None,
    ) -> Return[StudentDayModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
        return construct_return(
            await filter_student_day_model_stats(user_id, limit, checkpoint.updated_at if checkpoint else -1)
        )

    @strawberry.field
    async def pull_wordlists(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Wordlists]] = None,
    ) -> Return[Wordlists]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_wordlists(
                    db,
                    user.id,
                    user.from_lang,
                    limit,
                    checkpoint.id if checkpoint else "",
                    checkpoint.updated_at if checkpoint else -1,
                )
            )

    @strawberry.field
    async def pull_cards(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Cards]] = None,
    ) -> Return[Cards]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_cards(
                    db, user.id, limit, checkpoint.id if checkpoint else "", checkpoint.updated_at if checkpoint else -1
                )
            )

    @strawberry.field
    async def pull_recentsentences(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Recentsentences]] = None,
    ) -> Return[Recentsentences]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_recentsentences(
                    db, user.id, limit, checkpoint.id if checkpoint else "", checkpoint.updated_at if checkpoint else -1
                )
            )

    @strawberry.field
    async def pull_definitions(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Definitions]] = None,
    ) -> Return[Definitions]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return construct_return(
                await filter_cached_definitions(
                    db, user, limit, checkpoint.id if checkpoint else "", checkpoint.updated_at if checkpoint else -1
                )
            )

    @strawberry.field
    async def pull_surveys(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        checkpoint: Optional[InputCheckpoint[Surveys]] = None,
    ) -> Return[Surveys]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)  # raises exception if no logged in user
            objs = await filter_surveys(
                db,
                user.from_lang,
                user.to_lang,
                limit,
                checkpoint.id if checkpoint else "",
                checkpoint.updated_at if checkpoint else -1,
            )
            for obj in objs:
                obj.survey_json = json.dumps(obj.survey_json)
            return construct_return(objs)


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
    dj_obj.source_url = obj.source_url
    dj_obj.extra_data = obj.extra_data
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
    dj_obj.source_url = obj.source_url
    dj_obj.extra_data = obj.extra_data


def fill_question_answer(dj_obj: models.QuestionAnswer, obj: QuestionanswersInput, _user: models.AuthUser = None):
    dj_obj.question_id = obj.question_id
    dj_obj.student_answer = obj.student_answer
    dj_obj.feedback = obj.feedback
    dj_obj.is_correct = obj.is_correct


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
    async def push_cards(
        self, info: Info[Context, Any], cardsPushRow: Optional[list[Optional[PushRow[CardsInput]]]] = None
    ) -> list[Cards]:
        obj = []
        for row in cardsPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the cards are: {obj=}")
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            card_unities = []
            tup = tuple_(models.Card.user_id, models.Card.card_type, models.Card.word_id)
            for card in obj:
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

            for card in obj:
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
                dj_card.deleted = card.deleted
                db.add(dj_card)

            try:
                await db.commit()
            except Exception as e:
                logger.exception(f"Error saving updated card: {json.dumps(dataclasses.asdict(obj))}")
                logger.error(e)
                raise

            await publish_message(Cards.__name__, None, info.context.broadcast, user)
            return []

    @strawberry.mutation
    async def push_imports(
        self, info: Info[Context, Any], importsPushRow: Optional[list[Optional[PushRow[ImportsInput]]]] = None
    ) -> list[Imports]:
        obj = []
        for row in importsPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Imports.__name__=} is: {obj=}")
        await set_objects(obj, models.Import, info, Imports.__name__, Imports, fill_import)
        return []

    @strawberry.mutation
    async def push_languageclasses(
        self,
        info: Info[Context, Any],
        languageclassesPushRow: Optional[list[Optional[PushRow[LanguageclassesInput]]]] = None,
    ) -> list[Languageclasses]:
        obj = []
        for row in languageclassesPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Languageclasses.__name__=} is: {obj=}")
        await set_objects(obj, models.LanguageClass, info, Languageclasses.__name__, Languageclasses)
        return []

    @strawberry.mutation
    async def push_contents(
        self, info: Info[Context, Any], contentsPushRow: Optional[list[Optional[PushRow[ContentsInput]]]] = None
    ) -> list[Contents]:
        obj = []
        for row in contentsPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Contents.__name__=} is: {obj=}")
        content_list: list[Contents] = await set_objects(
            obj, models.Content, info, Contents.__name__, Contents, fill_content
        )
        for content in content_list:
            if content.processing == REQUESTED:
                await content_process_topic.send(value=ProcessData(type="content", id=content.id))
        return []

    @strawberry.mutation
    async def push_userlists(
        self, info: Info[Context, Any], userlistsPushRow: Optional[list[Optional[PushRow[UserlistsInput]]]] = None
    ) -> list[Userlists]:
        obj = []
        for row in userlistsPushRow:
            obj.append(row.newDocumentState)
        logger.debug(f"The info is: {info=}, and the channel {Userlists.__name__=} is: {obj=}")
        ulists: list[Userlists] = await set_objects(
            obj, models.UserList, info, Userlists.__name__, Userlists, fill_user_list
        )
        for ulist in ulists:
            if ulist.processing == REQUESTED:
                await list_process_topic.send(value=ProcessData(type="list", id=ulist.id))
        return []

    @strawberry.mutation
    async def push_recentsentences(
        self,
        info: Info[Context, Any],
        recentsentencesPushRow: Optional[list[Optional[PushRow[RecentsentencesInput]]]] = None,
    ) -> list[Recentsentences]:
        obj = []
        for row in recentsentencesPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Recentsentences.__name__=} is: {obj=}")

        async with async_session() as db:
            user = await get_user(db, info.context.request)
            obj_unities = []
            tup = tuple_(models.UserRecentSentences.user_id, models.UserRecentSentences.word_id)
            for ob in obj:
                obj_unities.append((user.id, int(ob.id)))

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

            for ob in obj:
                word_id = int(ob.id)
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
                dj_obj.lz_content = ob.lz_content
                dj_obj.deleted = ob.deleted
                db.add(dj_obj)
            try:
                await db.commit()
            except Exception as e:
                logger.exception(f"Error saving updated recentsentence: {json.dumps(dataclasses.asdict(ob))}")
                logger.error(e)
                raise

            await publish_message(Recentsentences.__name__, None, info.context.broadcast, user)
            return []

    @strawberry.mutation
    async def push_userdictionaries(
        self,
        info: Info[Context, Any],
        userdictionariesPushRow: Optional[list[Optional[PushRow[UserdictionariesInput]]]] = None,
    ) -> list[Userdictionaries]:
        obj = []
        for row in userdictionariesPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Userdictionaries.__name__=} is: {obj=}")
        await set_objects(
            obj, models.UserDictionary, info, Userdictionaries.__name__, Userdictionaries, fill_userdictionary
        )
        return []

    @strawberry.mutation
    async def push_studentregistrations(
        self,
        info: Info[Context, Any],
        studentregistrationsPushRow: Optional[list[Optional[PushRow[StudentregistrationsInput]]]] = None,
    ) -> list[Studentregistrations]:
        obj = []
        for row in studentregistrationsPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Goals.__name__=} is: {obj=}")
        await set_registrations(
            obj, models.StudentRegistration, info, Studentregistrations.__name__, Studentregistrations
        )
        return []

    @strawberry.mutation
    async def push_teacherregistrations(
        self,
        info: Info[Context, Any],
        teacherregistrationsPushRow: Optional[list[Optional[PushRow[TeacherregistrationsInput]]]] = None,
    ) -> list[Teacherregistrations]:
        obj = []
        for row in teacherregistrationsPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Goals.__name__=} is: {obj=}")
        await set_registrations(
            obj, models.TeacherRegistration, info, Teacherregistrations.__name__, Teacherregistrations
        )
        return []

    @strawberry.mutation
    async def push_goals(
        self, info: Info[Context, Any], goalsPushRow: Optional[list[Optional[PushRow[GoalsInput]]]] = None
    ) -> list[Goals]:
        obj = []
        for row in goalsPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Goals.__name__=} is: {obj=}")
        await set_objects(obj, models.Goal, info, Goals.__name__, Goals, fill_goal)
        return []

    @strawberry.mutation
    async def push_usersurveys(
        self, info: Info[Context, Any], usersurveysPushRow: Optional[list[Optional[PushRow[UsersurveysInput]]]] = None
    ) -> list[Usersurveys]:
        obj = []
        for row in usersurveysPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Usersurveys.__name__=} is: {obj=}")
        await set_objects(obj, models.UserSurvey, info, Usersurveys.__name__, Usersurveys, fill_user_survey)
        return []

    @strawberry.mutation
    async def push_questionanswers(
        self,
        info: Info[Context, Any],
        questionanswersPushRow: Optional[list[Optional[PushRow[QuestionanswersInput]]]] = None,
    ) -> list[Questionanswers]:
        obj = []
        for row in questionanswersPushRow:
            obj.append(row.newDocumentState)

        logger.debug(f"The info is: {info=}, and the channel {Questionanswers.__name__=} is: {obj=}")
        await set_objects(
            obj, models.QuestionAnswer, info, Questionanswers.__name__, Questionanswers, fill_question_answer
        )
        return []


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def changed_definitions(self, info: Info[Context, Any], token: str) -> Definitions:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up models.CachedDefinition.__name__ subscription for user %s", user_id)

        async with info.context.broadcast.subscribe(channel=f"changed{Definitions.__name__}") as subscriber:
            async for event in subscriber:
                logger.debug(f"Got a Definitions.__name__ subscription event for {event.message}")
                yield CollectionChanged(name=Definitions.__name__)

    @strawberry.subscription
    async def collection_changed(self, info: Info[Context, Any], token: str) -> CollectionChanged:
        user_id = get_user_id_from_token(token)
        logger.info("Setting up collection_changed subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel=f"changed{user_id}") as subscriber:
            async for event in subscriber:
                collection = clean_broadcaster_string(event.message)
                logger.info(f"Got a collection_changed subscription event for {user_id=} for {collection=}")
                yield CollectionChanged(name=collection)


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
