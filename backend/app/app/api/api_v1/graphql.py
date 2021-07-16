# -*- coding: utf-8 -*-
# pylint: disable=C0302

from __future__ import annotations

import copy
import dataclasses
import json  # import orjson as json
import logging
import os
from collections.abc import Callable
from dataclasses import field
from datetime import datetime
from typing import Any, List, Optional

import aiohttp
import pytz
import strawberry
from app import models
from app.api import deps
from app.cache import cached_definitions
from app.core.config import settings
from app.data import clean_broadcaster_string
from app.data.context import Context
from app.data.models import REQUESTED
from app.db.base_class import Base
from app.db.session import async_session
from app.enrich import latest_definitions_json_dir_path
from app.enrich.data import managers
from app.enrich.models import ensure_cache_preloaded
from app.models.mixins import ActivatorMixin, DetailedMixin
from app.models.user import AuthUser
from app.schemas.files import ProcessData
from app.worker.faustus import content_process_topic, list_process_topic
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.expression import and_, or_, select, text
from starlette import status
from starlette.requests import Request
from strawberry.types import Info
from strawberry.utils.str_converters import to_camel_case

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


@strawberry.type
class HSKEntry:
    # levels: List[HSKLevel]
    levels: Optional[List[int]] = None

    @staticmethod
    def from_dict(entries):
        if not entries:
            return HSKEntry(levels=[])
        return HSKEntry(levels=[int(v["hsk"]) for v in entries])


@strawberry.type
class FrequencyEntry:
    wcpm: str  # word count per million
    wcdp: str  # word count ??? percent -> basically the percentage of all subtitles that contain the word
    pos: str  # dot-separated list of parts of speech
    pos_freq: str  # dot-separated list of the frequencies of the above parts of speech

    @staticmethod
    def from_dict(entries):
        # there is a weird thing where there are values with no pinyin, but always just one
        # and there is always another entry that has a pinyin. No idea what this is...
        # Just get the first one with a pinyin
        if not entries:
            # return None
            return FrequencyEntry(wcpm="", wcdp="", pos="", pos_freq="")
        for v in entries:
            if v["pinyin"]:  # FIXME: this is brittle to making generic!
                return FrequencyEntry(wcpm=v["wcpm"], wcdp=v["wcdp"], pos=v["pos"], pos_freq=v["pos_freq"])
        return FrequencyEntry(
            wcpm=entries[0]["wcpm"],
            wcdp=entries[0]["wcdp"],
            pos=entries[0]["pos"],
            pos_freq=entries[0]["pos_freq"],
        )


@strawberry.type
class POSValuesSet:
    pos_tag: str  # this is the standardised tag
    values: List[str] = field(default_factory=list)  # is this a string or strings?


@strawberry.type
class ProviderTranslations:
    provider: str
    pos_translations: List[POSValuesSet] = field(default_factory=list)


@strawberry.type
class DefinitionSet:
    id: str
    graph: str
    sound: List[str]
    hsk: Optional[HSKEntry] = None  # TODO: make this generic???
    frequency: Optional[FrequencyEntry] = None  # TODO: make this generic???
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False  # for the moment, let's just assume it's not deleted :-)
    synonyms: List[POSValuesSet] = field(default_factory=list)
    provider_translations: List[ProviderTranslations] = field(default_factory=list)

    @staticmethod
    def from_model_asdict(definition: models.CachedDefinition, providers: List[str]):
        # copied from python 3.9.2 with addition of to_camel_case, and made to pass pylint!
        def _asdict_inner(obj, dict_factory=dict):
            if hasattr(type(obj), "__dataclass_fields__"):
                result = []
                for f in dataclasses.fields(obj):
                    value = _asdict_inner(getattr(obj, f.name), dict_factory)
                    result.append((to_camel_case(f.name), value))
                return dict_factory(result)
            if isinstance(obj, tuple) and hasattr(obj, "_fields"):
                return type(obj)(*[_asdict_inner(v, dict_factory) for v in obj])
            if isinstance(obj, (list, tuple)):
                return type(obj)(_asdict_inner(v, dict_factory) for v in obj)
            if isinstance(obj, dict):
                return type(obj)(
                    (_asdict_inner(k, dict_factory), _asdict_inner(v, dict_factory)) for k, v in obj.items()
                )
            return copy.deepcopy(obj)

        obj = DefinitionSet.from_model(definition, providers)
        dict_obj = _asdict_inner(obj)  # this doesn't work dict_obj = asdict(obj)
        del dict_obj["deleted"]
        return dict_obj

    @staticmethod
    def from_model(definition: models.CachedDefinition, providers: List[str]) -> DefinitionSet:
        stored = json.loads(definition.response_json)
        out_definition = DefinitionSet(
            id=str(definition.word_id),  # RxDB requires a str for the primary key of a collection
            graph=definition.source_text,
            updated_at=definition.cached_date.timestamp(),
            sound=stored["p"].split(),
            frequency=FrequencyEntry.from_dict(stored["metadata"]["frq"]),
            hsk=HSKEntry.from_dict(stored["metadata"]["hsk"]),
        )
        for pos, syns in stored["syns"].items():
            out_definition.synonyms.append(POSValuesSet(pos_tag=pos, values=syns))

        definitions = stored["defs"]
        for provider in providers:
            if provider not in definitions:
                continue
            sd = ProviderTranslations(provider=provider)
            for k2, v2 in definitions[provider].items():
                sd.pos_translations.append(POSValuesSet(pos_tag=k2, values=[entry["nt"] for entry in v2]))
            out_definition.provider_translations.append(sd)
        return out_definition


async def filter_cached_definitions(
    db: AsyncSession,
    user: AuthUser,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> List[DefinitionSet]:
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
        latest_name = os.path.basename(latest_definitions_json_dir_path(user))
        latest_cached_date = datetime.fromtimestamp(float(latest_name.split("-")[1]))
        latest_word_id = int(latest_name.split("-")[2])
        print("yo didssso", latest_name, latest_cached_date, latest_word_id)
        print(f"filter_cached_definitions: {user=}, {limit=}, {id=}, {updated_at=} ")
        stmt = stmt.where(
            models.CachedDefinition.cached_date == latest_cached_date,
            models.CachedDefinition.word_id == latest_word_id,
        )
        # the order by is probably not necessary, but may be in the future
        stmt = stmt.order_by(text("cached_date desc, word_id desc"))
        print(stmt)
        result = await db.execute(stmt)
        try:
            return [DefinitionSet.from_model(result.scalar_one(), providers)]
        except Exception:
            logger.exception(f"Error getting DefinitionSet for {stmt=}")
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
    try:
        stmt = stmt.order_by(text("cached_date desc, word_id desc")).limit(limit)
        result = await db.execute(stmt)
        definitions = [DefinitionSet.from_model(word, providers) for word in result.scalars().all()]
    except Exception:
        logger.exception(f"Error getting DefinitionSet for {stmt=}")
        raise
    return definitions


@strawberry.type
class WordModelStats:
    id: str
    nb_seen: Optional[int] = 0
    nb_seen_since_last_check: Optional[int] = 0
    last_seen: Optional[float] = 0
    nb_checked: Optional[int] = 0
    last_checked: Optional[float] = 0
    nb_translated: Optional[int] = 0
    last_translated: Optional[float] = 0
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    def from_model(dj_model):
        ws = WordModelStats(
            id=dj_model.word_id,
            nb_seen=dj_model.nb_seen,
            nb_seen_since_last_check=dj_model.nb_seen_since_last_check,
            nb_checked=dj_model.nb_checked,
            nb_translated=dj_model.nb_translated,
            updated_at=dj_model.updated_at.timestamp(),
        )
        if dj_model.last_seen:
            ws.last_seen = dj_model.last_seen.timestamp()
        if dj_model.last_checked:
            ws.last_checked = dj_model.last_checked.timestamp()
        if dj_model.last_translated:
            ws.last_translated = dj_model.last_translated.timestamp()
        return ws

    @staticmethod
    def from_list(wmlist: list):
        ws = WordModelStats(
            id=wmlist[8],
            nb_seen=wmlist[1],
            last_seen=wmlist[2],
            nb_checked=wmlist[3],
            last_checked=wmlist[4],
            nb_seen_since_last_check=wmlist[5],
            # nb_translated=wmlist[?],  # unused
            # is_known=wmlist[6]
            updated_at=wmlist[7],
        )
        return ws


def add_word_ids(user_words: list, lang_pair: str) -> list:
    cds = cached_definitions[lang_pair]
    filtered_words = []
    for x in user_words:
        if len(x[0]) > 10:
            logger.error("Trying to find an invalid word")
            logger.error(x)
            continue
        filtered_words.append(x)
    for uw in filtered_words:
        val = cds.get(uw[0])
        if not val:
            print(uw)
            raise Exception(f"Unable to find entry in cache for {uw[0]}, this should not be possible...")
        uw.append(val[2])
    return filtered_words


async def filter_word_model_stats_faust(
    user_id: int,
    lang_pair: str,
    limit: int,
    id: int,
    updated_at: float,
) -> List[WordModelStats]:

    logger.debug(f"filter_word_model_stats_faust started: {user_id=}, {limit=}, {id=}, {updated_at=}")

    if settings.DEBUG:
        async with async_session() as db:
            await ensure_cache_preloaded(db, lang_pair.split(":")[0], lang_pair.split(":")[1])

    async with aiohttp.ClientSession() as session:
        query = f"http://{settings.FAUST_HOST}:{settings.FAUST_PORT}/user_word_updates/{user_id}/{updated_at or 0}"
        async with session.get(query) as resp:
            resp.raise_for_status()
            updates = add_word_ids(await resp.json(), lang_pair)
            updates = sorted(updates, key=lambda k: (k[7], k[8]))
            if limit > 0:
                updates = updates[:limit]
            objs = [
                WordModelStats.from_list(user_word)
                for user_word in updates
                if user_word[8] > id or user_word[7] > updated_at
            ]
    return objs


async def filter_word_model_stats_db(
    db: AsyncSession,
    user_id: int,
    limit: int,
    ref: CommonType,
    model_ref: models.UserWord,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> List[CommonType]:
    # FIXME: currently unused, can probably delete as the faust version seems to work ok
    logger.debug(
        f"filter_word_model_stats_db started: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=}, {model_ref=}"
    )

    stmt = select(model_ref).where(model_ref.user_id == user_id).options(selectinload(model_ref.created_by))

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
                        model_ref.word_id > int(id),
                    ),
                )
            )

    result = await db.execute(stmt.order_by("updated_at", "id").limit(limit))
    obj_list = result.scalars().all()
    objs = [ref.from_model(dj_model) for dj_model in obj_list]
    logger.debug(
        f"filter_word_model_stats_db finished: {user_id=}, {limit=}, {id=}, {updated_at=}, {ref=}, {model_ref=}"
    )
    return objs


@strawberry.type
class WordList:
    id: str
    name: str
    word_ids: List[str]
    default: Optional[bool] = False
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    async def from_model(dj_model):
        async with async_session() as db:
            stmt = (
                select(models.UserListWord.word_id)
                .select_from(models.UserList)
                .join(models.UserList.created_by)
                .where(models.UserListWord.user_list_id == dj_model.id)
            )
            #  stmt = select(models.UserListWord.word_id).select_from(
            #     models.UserList).join(models.UserList.created_by).where(
            #         models.UserListWord.user_list_id==dj_model.id).options(contains_eager(models.UserList.created_by))
            result = await db.execute(stmt.order_by("default_order"))
            ulws = result.scalars().all()
            return WordList(
                id=dj_model.id,
                name=dj_model.title,
                default=(dj_model.created_by_id == 1 and dj_model.shared is True),  # created by admin and shared
                updated_at=dj_model.updated_at.timestamp(),
                word_ids=[str(w) for w in ulws],
            )


@strawberry.type
class Card:
    id: str
    interval: Optional[int] = 0
    due_date: Optional[float] = 0  # should this have a default value???
    repetition: Optional[int] = 0
    efactor: Optional[float] = 2.5
    front: Optional[str] = ""
    back: Optional[str] = ""
    updated_at: Optional[float] = 0
    first_revision_date: Optional[float] = 0
    last_revision_date: Optional[float] = 0
    known: Optional[bool] = False
    suspended: Optional[bool] = False
    deleted: Optional[bool] = False

    @staticmethod
    def from_model(dj_card):
        out_card = Card(
            id=f"{dj_card.word_id}-{dj_card.card_type}",
            interval=dj_card.interval,
            repetition=dj_card.repetition,
            efactor=dj_card.efactor,
            front=dj_card.front,
            back=dj_card.back,
            known=dj_card.known,
            suspended=dj_card.suspended,
            updated_at=dj_card.updated_at.timestamp(),
            deleted=dj_card.deleted,
        )
        if dj_card.first_revision_date:
            out_card.first_revision_date = dj_card.first_revision_date.timestamp()
        if dj_card.last_revision_date:
            out_card.last_revision_date = dj_card.last_revision_date.timestamp()
        if dj_card.due_date:
            out_card.due_date = dj_card.due_date.timestamp()

        return out_card


@strawberry.input
class CardsInput:
    id: str
    interval: Optional[int] = 0
    due_date: Optional[float] = 0
    repetition: Optional[int] = 0
    efactor: Optional[float] = 2.5
    front: Optional[str] = ""
    back: Optional[str] = ""
    updated_at: Optional[float] = 0
    first_revision_date: Optional[float] = 0
    last_revision_date: Optional[float] = 0
    known: Optional[bool] = False
    suspended: Optional[bool] = False
    deleted: Optional[bool] = False


async def filter_cards(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> List[Card]:
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
                            models.Card.card_type > card_type,
                        ),
                    ),
                )
            )
    result = await db.execute(stmt.order_by("updated_at", "word_id", "card_type").limit(limit))

    model_list = result.scalars().all()
    card_list = [Card.from_model(dj_card) for dj_card in model_list]
    return card_list


@strawberry.type
class CommonType:
    id: str
    created_by: Optional[str]
    updated_by: Optional[str]
    created_at: Optional[float] = 0
    updated_at: Optional[float] = 0
    title: Optional[str] = ""
    description: Optional[str] = ""
    status: Optional[int] = ActivatorMixin.ACTIVE_STATUS
    activate_date: Optional[float] = 0
    deactivate_date: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    def from_model_base(obj: DetailedMixin, Outtype: CommonType):
        out = Outtype(
            id=obj.id,
            created_by=obj.created_by_id,  # FIXME: change to username, but will need to joinload related!
            updated_by=obj.updated_by_id,  # FIXME: change to username, but will need to joinload related!
            title=obj.title,
            description=obj.description,
            status=obj.status,
            deleted=obj.deleted,
        )

        if obj.created_at:
            out.created_at = obj.created_at.timestamp()
        if obj.updated_at:
            out.updated_at = obj.updated_at.timestamp()
        if obj.activate_date:
            out.activate_date = obj.activate_date.timestamp()
        if obj.deactivate_date:
            out.deactivate_date = obj.deactivate_date.timestamp()

        return out


@strawberry.type
class Import(CommonType):
    processing: Optional[int] = 0
    process_type: Optional[int] = 0
    import_file: Optional[str] = ""
    analysis: Optional[str] = ""
    shared: Optional[bool] = False

    @staticmethod
    def from_model(obj):
        out = CommonType.from_model_base(obj, Import)
        out.processing = obj.processing
        out.process_type = obj.process_type
        out.import_file = obj.import_file
        out.analysis = obj.analysis
        out.shared = obj.shared
        return out


@strawberry.type
class Survey(CommonType):
    survey_json: Optional[str] = ""
    is_obligatory: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.Survey):
        out = CommonType.from_model_base(obj, Survey)
        out.survey_json = obj.survey_json
        out.is_obligatory = obj.is_obligatory
        return out


@strawberry.type
class UserSurvey(CommonType):  # FIXME: this isn't really a common_type, it doesn't have activator
    survey_id: Optional[str] = ""
    data: Optional[str] = ""

    @staticmethod
    def from_model(obj: models.UserSurvey):
        out = CommonType.from_model_base(obj, UserSurvey)
        out.data = obj.data
        out.survey_id = obj.survey_id
        return out


@strawberry.type
class Goal(CommonType):
    parent: Optional[str] = ""
    priority: Optional[int] = 0
    user_list: Optional[str] = ""

    @staticmethod
    def from_model(obj: models.Goal):
        out = CommonType.from_model_base(obj, Goal)
        out.parent = obj.parent_id if obj.parent_id else None
        out.priority = obj.priority
        out.user_list = obj.user_list_id if obj.user_list_id else None
        return out


@strawberry.type
class Content(CommonType):
    processing: Optional[int] = 0
    the_import: Optional[str] = ""
    content_type: Optional[int] = 1
    author: Optional[str] = ""
    cover: Optional[str] = ""
    lang: Optional[str] = ""
    shared: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.Content):
        out = CommonType.from_model_base(obj, Content)
        out.processing = obj.processing
        out.the_import = obj.the_import_id
        out.content_type = obj.content_type
        out.author = obj.author
        out.cover = obj.cover
        out.lang = obj.language
        out.shared = obj.shared
        return out


@strawberry.type
class UserList(CommonType):
    processing: Optional[int] = 0
    the_import: Optional[str] = ""
    minimum_doc_frequency: Optional[int] = 0
    minimum_abs_frequency: Optional[int] = 0
    order_by: Optional[int] = 0
    nb_to_take: Optional[int] = 0
    shared: Optional[bool] = False
    words_are_known: Optional[bool] = False
    only_dictionary_words: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.UserList):
        out = CommonType.from_model_base(obj, UserList)
        out.processing = obj.processing
        out.the_import = obj.the_import_id or ""
        out.minimum_abs_frequency = obj.minimum_abs_frequency
        out.minimum_doc_frequency = obj.minimum_doc_frequency
        out.order_by = obj.order_by
        out.nb_to_take = obj.nb_to_take
        out.shared = obj.shared
        out.words_are_known = obj.words_are_known
        out.only_dictionary_words = obj.only_dictionary_words
        return out


@strawberry.input
class CommonTypeInput:
    title: Optional[str]
    id: Optional[str] = ""
    status: Optional[int] = ActivatorMixin.ACTIVE_STATUS
    activate_date: Optional[float] = 0
    deactivate_date: Optional[float] = 0
    description: Optional[str] = ""
    deleted: Optional[bool] = False
    updated_at: Optional[float] = 0  # FIXME: is this required here?
    created_by: Optional[str] = ""
    created_at: Optional[float] = 0  # FIXME: is this required here?
    updated_by: Optional[str] = ""


@strawberry.input
class ImportsInput(CommonTypeInput):
    processing: Optional[int] = 1
    process_type: Optional[int] = 0
    import_file: Optional[str] = ""
    analysis: Optional[str] = ""
    shared: Optional[bool] = False


@strawberry.input
class GoalsInput(CommonTypeInput):
    parent: Optional[str] = ""
    priority: Optional[int] = 0
    user_list: Optional[str] = ""


@strawberry.input
class UserlistsInput(CommonTypeInput):
    processing: Optional[int] = 1
    the_import: Optional[str] = ""
    minimum_doc_frequency: Optional[int] = 0
    minimum_abs_frequency: Optional[int] = 0
    order_by: Optional[int] = 0
    nb_to_take: Optional[int] = 0
    shared: Optional[bool] = False
    words_are_known: Optional[bool] = False
    only_dictionary_words: Optional[bool] = False


@strawberry.input
class ContentsInput(CommonTypeInput):
    processing: Optional[int] = 0
    the_import: Optional[str] = ""
    content_type: Optional[int] = 1
    author: Optional[str] = ""
    cover: Optional[str] = ""
    lang: Optional[str] = ""
    shared: Optional[bool] = False


@strawberry.input
class UsersurveysInput(CommonTypeInput):
    survey_id: Optional[str] = ""
    data: Optional[str] = ""


async def filter_wordlists(
    db: AsyncSession,
    user_id: int,
    limit: int,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> List[CommonType]:

    logger.debug(
        f"filter_wordlists started: {user_id=}, {limit=}, {id=}, {updated_at=}, {WordList=}, {models.UserList=}"
    )

    stmt = (
        select(models.UserList)
        .where(
            or_(
                models.UserList.created_by_id == user_id,  # pylint: disable=W0143
                and_(models.UserList.created_by_id == 1, models.UserList.shared is True),  # pylint: disable=W0143
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

    result = await db.execute(stmt.order_by("updated_at", "id").limit(limit))
    obj_list = result.scalars().all()
    objs = [WordList.from_model(dj_model) for dj_model in obj_list]
    logger.debug(
        f"filter_wordlists finished: {user_id=}, {limit=}, {id=}, {updated_at=}, {WordList=}, {models.UserList=}"
    )
    return objs


async def filter_standard(
    db: AsyncSession,
    user_id: int,
    limit: int,
    ref: CommonType,
    model_ref: DetailedMixin,
    id: Optional[str] = "",
    updated_at: Optional[float] = -1,
) -> List[CommonType]:

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
    async def feed_imports(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[Import]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Import, models.Import, id, updated_at)

    @strawberry.field
    async def feed_userlists(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[UserList]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, UserList, models.UserList, id, updated_at)

    @strawberry.field
    async def feed_contents(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[Content]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Content, models.Content, id, updated_at)

    @strawberry.field
    async def feed_goals(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[Goal]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, Goal, models.Goal, id, updated_at)

    @strawberry.field
    async def feed_usersurveys(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[UserSurvey]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_standard(db, user.id, limit, UserSurvey, models.UserSurvey, id, updated_at)

    @strawberry.field
    async def feed_word_model_stats(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[WordModelStats]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            user_id = user.id
            lang_pair = user.lang_pair
            # payload = deps.get_current_good_tokenpayload(token=await deps.reusable_oauth2(info.context.request))
            # user_id = payload.sub
            # lang_pair = payload.lang_pair
            return await filter_word_model_stats_faust(user_id, lang_pair, limit, int(id) if id else 0, updated_at)
            # return await filter_word_model_stats_db(
            #     db, user.id, limit, WordModelStats, models.UserWord, word_id, updated_at
            # )

    @strawberry.field
    async def feed_wordlists(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[WordList]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_wordlists(db, user.id, limit, id, updated_at)

    @strawberry.field
    async def feed_cards(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[Card]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_cards(db, user.id, limit, id, updated_at)

    @strawberry.field
    async def feed_definitions(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[DefinitionSet]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            return await filter_cached_definitions(db, user, limit, id, updated_at)

    @strawberry.field
    async def feed_surveys(  # pylint: disable=E0213
        info: Info[Context, Any],
        limit: int,
        id: Optional[str] = "",
        updated_at: Optional[float] = -1,
    ) -> List[Survey]:
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            objs = await filter_standard(db, user.id, limit, Survey, models.Survey, id, updated_at)
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


def fill_import(dj_obj: models.Import, obj: ImportsInput):
    dj_obj.processing = obj.processing
    dj_obj.process_type = obj.process_type
    dj_obj.import_file = obj.import_file
    dj_obj.analysis = obj.analysis
    dj_obj.shared = obj.shared


def fill_goal(dj_obj: models.Goal, obj: GoalsInput):
    if obj.parent:
        dj_obj.parent_id = obj.parent
    dj_obj.priority = obj.priority
    dj_obj.user_list_id = obj.user_list


def fill_user_list(dj_obj: models.UserList, obj: UserlistsInput):
    dj_obj.processing = obj.processing
    dj_obj.the_import_id = obj.the_import
    dj_obj.minimum_doc_frequency = obj.minimum_doc_frequency
    dj_obj.minimum_abs_frequency = obj.minimum_abs_frequency
    dj_obj.order_by = obj.order_by
    dj_obj.nb_to_take = obj.nb_to_take
    dj_obj.shared = obj.shared
    dj_obj.words_are_known = obj.words_are_known
    dj_obj.only_dictionary_words = obj.only_dictionary_words


def fill_content(dj_obj: models.Content, obj: ContentsInput):
    dj_obj.processing = obj.processing
    dj_obj.the_import_id = obj.the_import
    dj_obj.content_type = obj.content_type
    dj_obj.author = obj.author
    dj_obj.cover = obj.cover
    dj_obj.language = obj.lang
    dj_obj.shared = obj.shared


def fill_user_survey(dj_obj: models.UserSurvey, obj: UsersurveysInput):
    dj_obj.survey_id = obj.survey_id
    dj_obj.data = obj.data


async def get_object(db: AsyncSession, model_ref: type[Base], id: str, user: AuthUser):
    stmt = select(model_ref).where(model_ref.id == id, model_ref.created_by == user)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def set_object(
    obj: CommonType,
    model_ref: type[Base],
    info: Info[Context, Any],
    channel: str,
    ref: type[CommonType],
    fill_object: Callable[[Base, CommonType], None],
):
    async with async_session() as db:
        user = await get_user(db, info.context.request)
        dj_obj = None
        if obj.id:
            dj_obj = await get_object(db, model_ref, obj.id, user)
        if not dj_obj:
            dj_obj = model_ref(id=obj.id, created_by=user, updated_by=user)
            db.add(dj_obj)

        fill_common(dj_obj, obj)
        fill_object(dj_obj, obj)

        try:
            await db.commit()
            # db.add(dj_obj)  # FIXME: why is this necessary with expire_on_commit==False?
            await info.context.broadcast.publish(channel=channel, message=str(user.id))
        except Exception as e:
            logger.exception(f"Error saving updated obj: {json.dumps(dataclasses.asdict(obj))}")
            logger.error(e)
            raise

        return ref.from_model(await get_object(db, model_ref, obj.id, user))


@strawberry.type
class Mutation:
    # type Mutation {
    #   setCard(card: CreateCard): Card
    # }
    @strawberry.mutation
    async def set_cards(self, info: Info[Context, Any], cards: CardsInput = None) -> Card:
        logger.warn(f"The info is: {info=}, and the card is: {cards=}")
        async with async_session() as db:
            user = await get_user(db, info.context.request)
            word_id, card_type = map(int, cards.id.split("-"))

            result = await db.execute(
                select(models.Card)
                .where(
                    models.Card.user == user,
                    models.Card.card_type == card_type,
                    models.Card.word_id == word_id,
                )
                .options(selectinload(models.Card.user))
            )
            dj_card = result.scalar_one_or_none() or models.Card(word_id=word_id, card_type=card_type, user=user)

            if cards.due_date:
                dj_card.due_date = datetime.fromtimestamp(cards.due_date, pytz.utc)

            if cards.first_revision_date:
                dj_card.first_revision_date = datetime.fromtimestamp(cards.first_revision_date, pytz.utc)
            if cards.last_revision_date:
                dj_card.last_revision_date = datetime.fromtimestamp(cards.last_revision_date, pytz.utc)

            dj_card.interval = cards.interval
            dj_card.repetition = cards.repetition
            dj_card.efactor = cards.efactor
            dj_card.front = cards.front
            dj_card.back = cards.back
            dj_card.known = cards.known
            dj_card.suspended = cards.suspended
            # FIXME: does this get done automatically???
            # dj_card.updated_at = datetime.now(pytz.utc)  # int(time.time())  # time_ns()? something else?
            dj_card.deleted = cards.deleted

            try:
                db.add(dj_card)
                await db.commit()
                await info.context.broadcast.publish(channel="cards", message=str(user.id))
            except Exception as e:
                logger.exception(f"Error saving updated card: {json.dumps(dataclasses.asdict(cards))}")
                logger.error(e)
                raise

            result = await db.execute(
                select(models.Card)
                .where(
                    models.Card.user == user,
                    models.Card.card_type == card_type,
                    models.Card.word_id == word_id,
                )
                .options(selectinload(models.Card.user))
            )
            dj_card = result.scalar_one_or_none()
            return Card.from_model(dj_card)

    @strawberry.mutation
    async def set_imports(self, info: Info[Context, Any], imports: ImportsInput = None) -> Import:
        channel = "imports"
        obj = imports
        logger.debug(f"The info is: {info=}, and the {channel=} is: {obj=}")
        return await set_object(obj, models.Import, info, channel, Import, fill_import)

    @strawberry.mutation
    async def set_contents(self, info: Info[Context, Any], contents: ContentsInput = None) -> Content:
        channel = "contents"
        obj = contents
        logger.debug(f"The info is: {info=}, and the {channel=} is: {obj=}")
        content: Content = await set_object(obj, models.Content, info, channel, Content, fill_content)
        if content.processing == REQUESTED:
            await content_process_topic.send(value=ProcessData(type="content", id=content.id))
        return content

    @strawberry.mutation
    async def set_userlists(self, info: Info[Context, Any], userlists: UserlistsInput = None) -> UserList:
        channel = "userlists"
        obj = userlists
        logger.debug(f"The info is: {info=}, and the {channel=} is: {obj=}")
        ulist: UserList = await set_object(obj, models.UserList, info, channel, UserList, fill_user_list)
        if ulist.processing == REQUESTED:
            await list_process_topic.send(value=ProcessData(type="list", id=ulist.id))
        return ulist

    @strawberry.mutation
    async def set_goals(self, info: Info[Context, Any], goals: GoalsInput = None) -> Goal:
        channel = "goals"
        obj = goals
        logger.debug(f"The info is: {info=}, and the {channel=} is: {obj=}")
        return await set_object(obj, models.Goal, info, channel, Goal, fill_goal)

    @strawberry.mutation
    async def set_usersurveys(self, info: Info[Context, Any], usersurveys: UsersurveysInput = None) -> UserSurvey:
        channel = "usersurveys"
        obj = usersurveys
        logger.warning(f"The info is: {info=}, and the {channel=} is: {obj=}")
        return await set_object(obj, models.UserSurvey, info, channel, UserSurvey, fill_user_survey)


async def changed_standard(info: Info[Context, Any], token: str, ref: type[CommonType]) -> CommonType:
    user_id = get_user_id_from_token(token)
    logger.debug("Setting up %ss subscription for user %s", ref.__name__, user_id)

    async with info.context.broadcast.subscribe(channel=f"{ref.__name__}s") as subscriber:
        async for event in subscriber:
            logger.debug(f"Got a {ref.__name__}s subscription event for {event.message}")
            yield ref(id="42")


@strawberry.type
class Subscription:
    # type Subscription {
    #   changedCard(token: String!): Card
    # }
    @strawberry.subscription
    async def changed_cards(self, info: Info[Context, Any], token: str) -> Card:
        user_id = get_user_id_from_token(token)

        logger.debug("Setting up card subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel="cards") as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a definitions subscription event for {user_id}")
                    yield Card(id="42")

    # type Subscription {
    #   changedWordModelStats(token: String!): WordModelStats
    # }
    @strawberry.subscription
    async def changed_wordmodelstats(self, info: Info[Context, Any], token: str) -> WordModelStats:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up word_model_stats subscription for user %s", user_id)

        async with info.context.broadcast.subscribe(channel="word_model_stats") as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a word_model_stats subscription event for {user_id}")
                    yield WordModelStats(id="42")

    # type Subscription {
    #   changedWordList(token: String!): WordList
    # }
    @strawberry.subscription
    async def changed_wordlists(self, info: Info[Context, Any], token: str) -> WordList:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up word_list subscription for user %s", user_id)
        async with info.context.broadcast.subscribe(channel="word_list") as subscriber:
            async for event in subscriber:
                if clean_broadcaster_string(event.message) == str(user_id):
                    logger.debug(f"Got a word_list subscription event for {user_id}")
                    yield WordList(id="42", name="tmol", word_ids=["42"])

    # type Subscription {
    #   changedDefinition(token: String!): DefinitionSet
    # }
    @strawberry.subscription
    async def changed_definitions(self, info: Info[Context, Any], token: str) -> DefinitionSet:
        user_id = get_user_id_from_token(token)
        logger.debug("Setting up definitions subscription for user %s", user_id)

        async with info.context.broadcast.subscribe(channel="definitions") as subscriber:
            async for event in subscriber:
                logger.debug(f"Got a definitions subscription event for {event.message}")
                yield DefinitionSet(id="42", graph="四十二", sound=["42"])

    @strawberry.subscription
    async def changed_imports(self, info: Info[Context, Any], token: str) -> Import:
        return changed_standard(info, token, Import)

    @strawberry.subscription
    async def changed_goals(self, info: Info[Context, Any], token: str) -> Goal:
        return changed_standard(info, token, Goal)

    @strawberry.subscription
    async def changed_contents(self, info: Info[Context, Any], token: str) -> Content:
        return changed_standard(info, token, Content)

    @strawberry.subscription
    async def changed_userlists(self, info: Info[Context, Any], token: str) -> UserList:
        return changed_standard(info, token, UserList)

    @strawberry.subscription
    async def changed_usersurveys(self, info: Info[Context, Any], token: str) -> UserSurvey:
        return changed_standard(info, token, UserSurvey)


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
