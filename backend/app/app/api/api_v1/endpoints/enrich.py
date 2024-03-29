# -*- coding: utf-8 -*-

from __future__ import annotations

import datetime
import json
import logging
import os
import pathlib
import re
import shutil
import uuid
from collections import ChainMap
from typing import Any

import aiofiles
from app import models, schemas
from app.api import deps
from app.api.api_v1 import types
from app.api.api_v1.graphql import Definitions
from app.api.api_v1.subs import publish_message
from app.cache import cached_definitions
from app.core.config import settings
from app.data.context import get_broadcast
from app.data.importer.common import process
from app.enrich import TokenPhoneType, enrich_html_fragment, enrich_plain_to_html, latest_db_fragments_dir_path
from app.enrich.cache import SQLITE_FILENAME, ensure_cached_definitions, regenerate_personal_db
from app.enrich.data import EnrichmentManager, managers
from app.enrich.models import definitions, reload_definitions_cache
from app.fworker import import_process_topic, regenerate, regenerate_dbs
from app.generative.openai.mcq import get_multiple_choice_qa_chat
from app.models import CachedDefinition, Import
from app.models.data import Content, FreeQuestion, Question
from app.models.lookups import OpenAIApiLookup
from app.models.user import absolute_imports_dir_path, absolute_imports_path, absolute_resources_path
from app.ndutils import gather_with_concurrency
from app.schemas.cache import DataType, RegenerationType
from app.schemas.files import ProcessData
from app.subs import search_db_for_streamdetails
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.datastructures import UploadFile
from fastapi.param_functions import Form
from fastapi.params import File
from pydantic.main import BaseModel
from sqlalchemy import and_, func
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.sql.expression import select
from starlette.responses import FileResponse

logger = logging.getLogger(__name__)


class InfoRequest(BaseModel):
    data: str


class Subtitle(BaseModel):
    url: str
    lang: str | None = None
    label: str | None = None
    content: str | None = None


class StreamDetails(BaseModel):
    imdb_id: str | None = None
    streamer: str  # "youku" | "netflix"
    canonical_url: str
    streamer_id: str
    category: str  # "movie" | "series" | "unknown"
    language: str  # the two-letter language code ('zh', 'fr', 'en') of the StreamDetails titles, etc.
    duration: int
    subtitles: list[Subtitle] | None = None
    stream_type: str  # "trailer" | "full" | "unknown"
    season_id: str | None = None
    season_title: str | None = None
    season_short_name: str | None = None
    season_number: int | None = None
    season_year: int | None = None
    episode: int | None = None
    episode_title: str | None = None
    year: int | None = None  # year of movie or first season
    country: str | None = None
    show_id: str | None = None
    show_title: str | None = None
    original_title: str | None = None
    show_genre: str | None = None


router = APIRouter()


# PROD API
@router.get("/regenerate_dbs")
async def api_regenerate_dbs(_current_user: models.AuthUser = Depends(deps.get_current_active_superuser)):
    await regenerate_dbs()
    return {"result": "success"}


@router.get("/regenerate_all")
async def api_regenerate_all(_current_user: models.AuthUser = Depends(deps.get_current_active_superuser)):
    await regenerate(RegenerationType(data_type=DataType.all))
    return {"result": "success"}


@router.get("/regenerate_hanzi")
async def api_regenerate_hanzi(_current_user: models.AuthUser = Depends(deps.get_current_active_superuser)):
    await regenerate(RegenerationType(data_type=DataType.characters))
    return {"result": "success"}


@router.get("/ensure_definitions_cache")
async def ensure_definitions_cache(db: AsyncSession = Depends(deps.get_db)):
    await load_definitions_cache(db)
    await ensure_cached_definitions(db)
    return {"result": "success"}


@router.get("/load_definitions_cache")
async def load_definitions_cache(db: AsyncSession = Depends(deps.get_db), force_reload: bool = False):
    for lang_pair in managers:
        manager = managers.get(lang_pair)
        if not cached_definitions[lang_pair] or (settings.DEBUG and force_reload):
            logger.info("Loading cached_definitions for lang_pair %s", lang_pair)
            await reload_definitions_cache(db, manager.from_lang, manager.to_lang)
    return {"result": "success"}


@router.get("/dbexports.json", name="dbexports_part_urls")
async def db_export_urls(
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    dbs_path = latest_db_fragments_dir_path(current_user.lang_pair, current_user.translation_providers)
    base_db_path = os.path.join(dbs_path, f"{SQLITE_FILENAME}")
    await regenerate_personal_db(base_db_path, current_user.id, current_user.lang_pair)
    find_re = r"tc\.db\.\d{4}\.part"
    dbs_path = absolute_resources_path(current_user.id, SQLITE_FILENAME)
    files = sorted(
        [os.path.basename(f.path) for f in os.scandir(dbs_path) if f.is_file() and re.match(find_re, f.name)]
    )

    if files:
        return files

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Server does not support user dictionaries for {current_user}",
    )


@router.get("/decache", name="decache")
async def db_decache(
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    destination = absolute_resources_path(current_user.id, SQLITE_FILENAME)
    shutil.rmtree(destination, ignore_errors=True)
    return {"result": "success"}


@router.get("/dbexports/{resource_path:path}", name="dbexports_part")
def db_export_part(
    resource_path: str,
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    # FIXME: better perms checking for providers
    destination = absolute_resources_path(current_user.id, SQLITE_FILENAME)
    abspath = os.path.join(destination, resource_path)
    if abspath != os.path.normpath(abspath) or not os.path.isfile(abspath):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request",
        )
    # this fake media_type means it will get brotli compressed, which gives about a 4x compression!
    return FileResponse(abspath, media_type="application/vnd.ms-fontobject")


@router.post("/lemma_test", response_model=Any, name="lemma_test")
async def lemma_test(
    info_request: InfoRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.AuthUser = Depends(deps.get_current_active_user),
):
    data = {}

    manager: EnrichmentManager = managers.get(current_user.lang_pair)

    w = info_request.data
    if not w:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )

    raw_model = await manager.parser().parse(w)
    data["corenlp"] = raw_model

    return data


@router.post("/word_definitions", response_model=Any, name="word_definitions")
async def word_definitions(
    info_request: InfoRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.AuthUser = Depends(deps.get_current_active_user),
):
    """
    Get the definitions from all configured dictionaries for the language pair of the user
    along with an existing note for the word. The input is in raw form (just the word, not json)
    """

    # FIXME: this method returns far too much useless data, and hits the DB when it doesn't
    # need to. It should also almost certainly be a direct hit to the graphql API, but that
    # will require some work and this "Just Works"...
    data = {}

    manager: EnrichmentManager = managers.get(current_user.lang_pair)

    w = info_request.data
    if not w:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )
    if len(w) > manager.max_word_length():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Your source language has a maximum word length of {manager.max_word_length()} but you sent {len(w)}"
            ),
        )

    providers = current_user.dictionary_ordering.split(",")

    t = {"word": w, "pos": "NN", "lemma": w}  # fake pos, here we don't care
    if not manager.enricher().needs_enriching(t) or manager.enricher().clean_text(w) != w:
        return {}  # if unclean, fail silently...

    await definitions(db, manager, t)
    # now we get the full record from the db - why do I need this again?
    result = await db.execute(
        select(CachedDefinition).filter_by(
            source_text=w,
            from_lang=current_user.from_lang,
            to_lang=current_user.to_lang,
        )
    )
    obj = result.scalar_one()
    graphql_definition = Definitions.from_model_asdict(obj, providers)

    other_defs = []

    if w != w.lower():
        t = {"word": w, "pos": "NN", "lemma": w.lower()}  # fake pos, here we don't care
        await definitions(db, manager, t)
        result = await db.execute(
            select(CachedDefinition).filter_by(
                source_text=w.lower(),
                from_lang=current_user.from_lang,
                to_lang=current_user.to_lang,
            )
        )
        obj = result.scalar_one()
        other_defs.append(Definitions.from_model_asdict(obj, providers))

    # FIXME: iterate on all lookup providers for each lemma returned
    # (plus the original?)
    lemmas = await manager.word_lemmatizer().lemmatize(w)
    lemmas.discard(w)
    lemmas.discard(w.lower())
    for lem in lemmas:
        # this gives us the JSON version and ensures that it has been loaded to the DB
        t = {"word": w, "pos": "NN", "lemma": lem}  # fake pos, here we don't care
        await definitions(db, manager, t)
        result = await db.execute(
            select(CachedDefinition).filter_by(
                source_text=lem,
                from_lang=current_user.from_lang,
                to_lang=current_user.to_lang,
            )
        )
        obj = result.scalar_one()
        other_defs.append(Definitions.from_model_asdict(obj, providers))

    # modelStats = next(
    #     iter(
    #         json.loads(
    #             serializers.serialize(
    #                 "json",
    #                 UserWord.objects.filter(user=request.user, word__source_text=w),
    #                 fields=("nb_seen", "last_seen", "nb_checked", "last_checked"),
    #             )
    #         )
    #     ),
    #     None,
    # )
    data = {
        # "json_definition": json_definition,
        "definition": graphql_definition,  # the only one currently used
        "other_definitions": other_defs,
        # "model_stats": [modelStats["fields"]] if modelStats else [],
    }

    return data


@router.post("/enrich_json", name="enrich_json")
async def enrich_json(
    info_request: InfoRequest,
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    outdata = {}
    manager = managers.get(current_user.lang_pair)
    text = info_request.data
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )

    outdata = await manager.enricher().enrich_to_json(
        text,
        manager,
        translate_sentence=False,
        best_guess=False,
        phone_type=TokenPhoneType.NONE,
        fill_id=True,
        available_def_providers=current_user.translation_providers,
    )
    return outdata


@router.post("/translate", name="translate")
async def translate(
    info_request: InfoRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    outdata = {}
    manager = managers.get(current_user.lang_pair)
    text = info_request.data
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )
    outdata, _ = await manager.default().translate(db, text)
    return outdata


@router.post("/enrich_json_full", name="enrich_json_full")
async def enrich_json_full(
    info_request: InfoRequest,
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    outdata = {}

    manager = managers.get(current_user.lang_pair)
    text = info_request.data
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )

    outdata = await manager.enricher().enrich_to_json_phat(
        text, manager, translate_sentence=True, best_guess=True, deep_transliterations=True
    )
    return outdata


@router.post("/enrich_html_to_json", name="enrich_html_to_json")
async def enrich_html_to_json(
    info_request: InfoRequest,
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    manager = managers.get(current_user.lang_pair)
    text = info_request.data
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )

    html, slim_models = await enrich_html_fragment(text, manager)
    model_futures = [
        manager.enricher().enrich_parse_to_aids_json(
            timestamp,
            model,
            manager,
            translate_sentence=False,
            # best_guess=True,
            best_guess=False,
            phone_type=TokenPhoneType.NONE,
            fill_id=True,
            available_def_providers=current_user.translation_providers,
            clean=False,
        )
        for timestamp, model in slim_models.items()
    ]

    processed_files_list = await gather_with_concurrency(
        settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
        *(model_futures),
    )
    processed_files_dict = dict(ChainMap(*processed_files_list))  # re-merge dicts from list
    models = processed_files_dict.values()
    analysis = json.dumps(
        await process(models, Import.VOCABULARY_ONLY),
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return {"html": html, "models": processed_files_dict, "analysis": analysis}


async def monthly_gen_quota_used(db, user_id):
    current_time = datetime.datetime.now(tz=datetime.timezone.utc)
    four_weeks_ago = current_time - datetime.timedelta(weeks=4)
    used_quota = await db.scalar(
        select(func.count())
        .select_from(OpenAIApiLookup)
        .where(and_(OpenAIApiLookup.created_by_id == user_id, OpenAIApiLookup.created_at >= four_weeks_ago))
    )
    return used_quota


@router.post("/text_to_qa", name="text_to_qa")
async def text_to_qa(
    info_request: InfoRequest,
    current_user: models.AuthUser = Depends(deps.get_current_good_user),
    db: AsyncSession = Depends(deps.get_db),
):
    outdata = {}
    manager = managers.get(current_user.lang_pair)
    text = info_request.data
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )

    try:
        gen_model: str = json.loads(current_user.config)["genModel"]
        gen_quota: int = int(json.loads(current_user.config)["genQuota"])
    except json.decoder.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You have not been authorised to generate question-answers",
        )

    if not gen_model.startswith("gpt-"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You have not been authorised to generate question-answers",
        )
    used_quota = await monthly_gen_quota_used(db, current_user.id)
    if gen_quota <= used_quota:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="You have already used your quota for the period",
        )
    qa = await get_multiple_choice_qa_chat(db, text[:2000], current_user, settings.OPENAI_PROMPT_VERSION, gen_model)
    answers = [a["answer"] for a in qa["answers"]]
    fragment_futures = [enrich_plain_to_html("a", qa_text, manager, True) for qa_text in answers + [qa["question"]]]

    processed_texts_list = await gather_with_concurrency(
        settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
        *(fragment_futures),
    )
    models = {}
    for i in range(4):
        qa["answers"][i]["answer"] = {
            "mid": str(list(processed_texts_list[i][2].keys())[0]),
            "text": qa["answers"][i]["answer"],
        }
        models.update(processed_texts_list[i][2])

    qa["question"] = {"mid": str(list(processed_texts_list[4][2].keys())[0]), "text": qa["question"]}

    question = Question(
        title="",  # FIXME: nasty fake field
        question=json.dumps(qa["question"]),
        created_by=current_user,
        updated_by=current_user,
        question_type=Question.MCQ,
        extra_data=json.dumps(qa["answers"]),
    )

    free_q = FreeQuestion(
        question=question,
        context=text,
        created_by=current_user,
        updated_by=current_user,
    )

    db.add(question)
    db.add(free_q)
    await db.commit()

    broadcast = await get_broadcast()
    await publish_message(types.Questions.__name__, None, broadcast, user_id=str(current_user.id))
    await publish_message(types.FreeQuestions.__name__, None, broadcast, user_id=str(current_user.id))

    models.update(processed_texts_list[4][2])
    model_futures = [
        manager.enricher().enrich_parse_to_aids_json(
            timestamp,
            model,
            manager,
            translate_sentence=False,
            # best_guess=True,
            best_guess=False,
            phone_type=TokenPhoneType.NONE,
            fill_id=True,
            available_def_providers=current_user.dictionary_ordering,
            clean=False,
        )
        for timestamp, model in models.items()
    ]
    rich_models = await gather_with_concurrency(
        settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
        *(model_futures),
    )
    for model in rich_models:
        models.update(model)

    outdata = {
        "models": models,
        "questions": [
            {
                "id": str(question.id),
                "created_at": question.created_at,
                "updated_at": question.updated_at,
                "question": json.loads(question.question),
                "question_type": question.question_type,
                "extra_data": json.loads(question.extra_data),
                "shared": question.shared,
            }
        ],
    }
    return outdata


@router.post("/import_file", name="import_file")
async def import_file(
    filename: str = Form(...),
    afile: UploadFile = File(...),
    current_user: models.AuthUser = Depends(deps.get_current_good_user),
    db: AsyncSession = Depends(deps.get_db),
):
    import_id = os.path.basename(filename).split("_")[0]
    logger.warn(f"Importing file {filename} for user {current_user.id}")
    stmt = select(Import.id).where(Import.id == import_id)
    result = await db.execute(stmt)
    is_ready = result.scalar_one_or_none()
    if not is_ready:
        # we need this because the sync needs to happen before this can
        logger.warn(f"{import_id} for {filename} for user {current_user.id} is not ready yet")
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Import not ready for file",
        )

    filepath = absolute_imports_path(current_user.id, filename)
    pathlib.Path(os.path.dirname(filepath)).mkdir(parents=True, exist_ok=True)

    logger.warn(f"{import_id} for {filename} for user {current_user.id} is about to be saved")
    async with aiofiles.open(filepath, "wb") as out_file:
        await out_file.write(afile.file.read())
    file_event = ProcessData(type="import", id=import_id)
    logger.warn(f"{import_id} should now be sent to kafka")
    await import_process_topic.send(value=file_event)

    return {"status": "success"}


@router.post("/streaming_title_search", name="streaming_title_search")
async def streaming_title_search(
    stream_details: StreamDetails,
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
    db: AsyncSession = Depends(deps.get_db),
):
    media_lang = current_user.lang_pair.split(":")[0]  # from_lang
    contents = []
    existing = await search_db_for_streamdetails(db, stream_details, media_lang)
    if existing:
        contents = existing.contents

    content_ids = []
    import_ids = []
    output_dir = absolute_imports_dir_path(current_user.id)

    if contents:
        for content in contents:
            content_ids.append(content.id)
    else:
        sub_details = []
        valid_subs = []
        for sub in stream_details.subtitles or []:
            if (sub.lang == media_lang or sub.lang == "zhe" and media_lang in ["zh-Hans", "en"]) and sub.content:
                sub_details.append({"lang": sub.lang, "url": sub.url})
                valid_subs.append(sub)

        if not valid_subs:
            # for the moment we aren't looking, as Youku is quite heavily censored and intl sites
            # will never have their version, while NF has almost all subs for the markets they are in.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No subtitles found")

        sd = models.StreamDetails(
            title=stream_details.episode_title or stream_details.show_title,
            created_by_id=current_user.id,
            updated_by_id=current_user.id,
            imdb_id=stream_details.imdb_id,
            streamer=stream_details.streamer,
            canonical_url=stream_details.canonical_url,
            streamer_id=stream_details.streamer_id,
            category=stream_details.category,
            language=stream_details.language,
            duration=stream_details.duration,
            subtitles=json.dumps(sub_details),
            stream_type=stream_details.stream_type,
            season_id=stream_details.season_id,
            season_title=stream_details.season_title,
            season_short_name=stream_details.season_short_name,
            season_number=stream_details.season_number,
            season_year=stream_details.season_year,
            episode=stream_details.episode,
            episode_title=stream_details.episode_title,
            year=stream_details.year,
            country=stream_details.country,
            show_id=stream_details.show_id,
            show_title=stream_details.show_title,
            original_title=stream_details.original_title,
            show_genre=stream_details.show_genre,
        )
        # we need to download the subtitles and then process them
        for i, sub in enumerate(valid_subs, start=1):
            if i > 1:
                # TODO: Actually, we don't really need more than one, provided the subs are ok.
                # To date, with the supported streamers, all the subs are pretty much ok, or none of them are.
                # So having more than one just clogs up the users interface.
                continue
            ext = "ass" if stream_details.streamer == "youku" else "vtt"  # FIXME: nasty
            sub_filename = f"{i}-{sub.lang}-{stream_details.streamer_id}.{ext}"
            titles = ", ".join(
                str(x)
                for x in [
                    stream_details.episode_title,
                    stream_details.episode,
                    stream_details.season_title,
                    stream_details.show_title,
                ]
                if x
            )
            logger.debug(f"Going to process {sub_filename=}")
            impo = Import()
            impo.id = uuid.uuid4()
            import_ids.append(impo.id)
            impo.title = f"{i} : {titles} : {stream_details.category}"
            impo.description = ""
            impo.created_by_id = current_user.id
            impo.updated_by_id = current_user.id
            impo.shared = True
            impo.import_file = f"{impo.id}_{sub_filename}"
            impo.source_url = stream_details.canonical_url
            sub_file = os.path.join(output_dir, impo.import_file)
            pathlib.Path(output_dir).mkdir(parents=True, exist_ok=True)
            with open(sub_file, "w") as f:
                f.write(sub.content)
            db.add(impo)
            content = Content()
            content.id = uuid.uuid4()
            content_ids.append(content.id)
            content.title = impo.title
            content.description = ""
            content.language = media_lang
            content.the_import = impo
            content.created_by_id = current_user.id
            content.updated_by_id = current_user.id
            content.content_type = Content.VIDEO
            content.shared = True
            content.source_url = stream_details.canonical_url
            impo.content = content
            db.add(impo.content)
            sd.contents.append(content)
            logger.debug(f"Added {sub_file=}, committing")

        db.add(sd)
        await db.commit()
        for import_id in import_ids:
            file_event = ProcessData(type="import", id=import_id)
            await import_process_topic.send(value=file_event)

    return {"content_ids": content_ids}


@router.post("/resubmit_import", name="resubmit_import")
async def resubmit_import(  # pylint: disable=R0914  # FIXME: consider reducing
    info_request: InfoRequest,
    _current_user: models.AuthUser = Depends(deps.get_current_active_superuser),
):
    file_event = ProcessData(type="import", id=info_request.data)
    await import_process_topic.send(value=file_event)
    return {"status": "ok"}
