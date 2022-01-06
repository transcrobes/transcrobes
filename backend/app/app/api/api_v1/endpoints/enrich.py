# -*- coding: utf-8 -*-

from __future__ import annotations

import logging
import os
import pathlib
from typing import Any

import aiofiles
from app import models, schemas
from app.api import deps
from app.api.api_v1.graphql import DefinitionSet
from app.cache import cached_definitions
from app.core.config import settings
from app.enrich import TokenPhoneType, definitions_json_paths, hanzi_json_paths
from app.enrich.data import EnrichmentManager, managers
from app.enrich.models import definition, reload_definitions_cache
from app.fworker import import_process_topic, regenerate
from app.models import CachedDefinition, Import
from app.models.user import absolute_imports_path
from app.schemas.cache import DataType, RegenerationType
from app.schemas.files import ProcessData
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.datastructures import UploadFile
from fastapi.param_functions import Form
from fastapi.params import File
from pydantic.main import BaseModel
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select
from starlette.responses import FileResponse

logger = logging.getLogger(__name__)


class InfoRequest(BaseModel):
    data: str


router = APIRouter()


# PROD API
@router.get("/regenerate_all")
async def api_regenerate_all(_current_user: models.AuthUser = Depends(deps.get_current_active_superuser)):
    await regenerate(RegenerationType(data_type=DataType.both))
    return {"result": "success"}


@router.get("/load_definitions_cache")
async def load_definitions_cache(db: AsyncSession = Depends(deps.get_db), force_reload: bool = False):
    for lang_pair in managers:
        manager = managers.get(lang_pair)
        if not cached_definitions[lang_pair] or (settings.DEBUG and force_reload):
            logger.info("Loading cached_definitions for lang_pair %s", lang_pair)
            await reload_definitions_cache(db, manager.from_lang, manager.to_lang)
    return {"result": "success"}


@router.get("/exports.json", name="exports_json_urls")
def definitions_export_urls(
    current_user: models.AuthUser = Depends(deps.get_current_good_user),
):
    inmem_file = definitions_json_paths(current_user, router)
    if inmem_file:
        return inmem_file

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Server does not support user dictionaries for {current_user}",
    )


@router.get("/exports/{resource_path:path}", name="exports_json")
def definitions_export_json(
    resource_path: str,
    # current_user: models.AuthUser = Depends(deps.get_current_good_user),
    _current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    # FIXME: better perms checking for providers
    abspath = os.path.join(settings.DEFINITIONS_CACHE_DIR, resource_path)
    if abspath != os.path.normpath(abspath) or not os.path.isfile(abspath):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request",
        )

    return FileResponse(abspath)


@router.get("/hzexports.json", name="hzexports_json_urls")
def hanzi_export_urls(
    # current_user: models.AuthUser = Depends(deps.get_current_good_user),
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    inmem_file = hanzi_json_paths(current_user.id, router)
    if inmem_file:
        return inmem_file

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Server does not support user dictionaries for {current_user}",
    )


@router.get("/hzexports/{resource_path:path}", name="hzexports_json")
def hanzi_export_json(
    resource_path: str,
    _current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    abspath = os.path.join(settings.HANZI_CACHE_DIR, resource_path)
    if not abspath == os.path.normpath(abspath) or not os.path.isfile(abspath):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request",
        )

    return FileResponse(abspath)


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

    t = {"word": w, "pos": "NN", "lemma": w}  # fake pos, here we don't care
    if not manager.enricher().needs_enriching(t) or manager.enricher().clean_text(w) != w:
        return {}  # if unclean, fail silently...

    # FIXME: iterate on all lookup providers for each lemma returned
    # (plus the original?)
    # lemmas = manager.word_lemmatizer().lemmatize(w)

    # this gives us the JSON version and ensures that it has been loaded to the DB
    await definition(db, manager, t)

    providers = current_user.dictionary_ordering.split(",")

    result = await db.execute(
        select(CachedDefinition).filter_by(
            source_text=w,
            from_lang=current_user.from_lang,
            to_lang=current_user.to_lang,
        )
    )
    obj = result.scalar_one()

    graphql_definition = DefinitionSet.from_model_asdict(obj, providers)

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
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Server does not support language pair {current_user.lang_pair}",
        )

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
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Server does not support language pair {current_user.lang_pair}",
        )

    text = info_request.data
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Incorrectly formed query, you must provide a JSON like { "data": "好" }"',
        )
    print("Going to translate %s", text)
    outdata, _ = await manager.default().translate(db, text)
    return outdata


@router.post("/enrich_json_full", name="enrich_json_full")
async def enrich_json_full(
    info_request: InfoRequest,
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    outdata = {}

    manager = managers.get(current_user.lang_pair)
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Server does not support language pair {current_user.lang_pair}",
        )

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


@router.post("/import_file", name="import_file")
async def import_file(
    filename: str = Form(...),
    afile: UploadFile = File(...),
    current_user: models.AuthUser = Depends(deps.get_current_good_user),
    db: AsyncSession = Depends(deps.get_db),
):
    import_id = os.path.basename(filename).split("_")[0]
    stmt = select(Import.id).where(Import.id == import_id)
    result = await db.execute(stmt)
    is_ready = result.scalar_one_or_none()
    if not is_ready:
        # we need this because the sync needs to happen before this can
        return {"status": "unknown_import"}

    filepath = absolute_imports_path(current_user.id, filename)
    pathlib.Path(os.path.dirname(filepath)).mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(filepath, "wb") as out_file:
        await out_file.write(afile.file.read())
    file_event = ProcessData(type="import", id=import_id)
    await import_process_topic.send(value=file_event)

    return {"status": "success"}
