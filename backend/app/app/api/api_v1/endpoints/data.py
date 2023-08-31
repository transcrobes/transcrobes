# -*- coding: utf-8 -*-

from __future__ import annotations

import hashlib
import json
import logging
import mimetypes
import os
from email.utils import formatdate
from typing import Annotated, Any, List

import orjson
from aiokafka import AIOKafkaProducer
from app import models, schemas, stats
from app.api import deps
from app.core.config import settings
from app.data.models import DATA_JS_SUFFIX, DATA_JSON_SUFFIX, ENRICH_JSON_SUFFIX, PARSE_JSON_SUFFIX
from app.models.user import SHARED_USER_ID, absolute_resources_path
from fastapi import APIRouter, Depends, Header
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse, Response
from starlette import status
from starlette.responses import JSONResponse
from user_agents import parse

logger = logging.getLogger(__name__)
router = APIRouter()

aioproducer = AIOKafkaProducer(client_id=settings.PROJECT_NAME, bootstrap_servers=settings.KAFKA_BROKER)


@router.post("/user_events")
async def user_events(
    events: List[Any],
    # current_user: models.AuthUser = Depends(deps.get_current_active_user),
    current_user: schemas.TokenPayload = Depends(deps.get_current_active_tokenpayload),
) -> Any:  # FIXME: Any?
    vocab = []
    card = []
    read = []
    activities = []
    other = []
    try:
        for e in events:
            if e["type"] in ["activity"]:
                event = {
                    "type": e["type"],
                    "start": int(e["start"]),
                    "end": int(e["end"]),
                    "data": e["url"],
                    "user_id": current_user.id,
                }
                activities.append(event)
            elif e["type"] in ["bulk_vocab"]:
                event = {
                    "data": e["data"],
                    "type": e["type"],
                    "source": e["source"],
                    "user_stats_mode": e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
                    "user_id": current_user.id,
                }
                vocab.append(event)
            elif e["type"] in ["practice_card"]:
                event = {
                    "type": e["type"],
                    "source": e["source"],
                    "user_stats_mode": e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
                    "user_id": current_user.id,
                    "target_word": e["data"]["target_word"],
                    "grade": e["data"]["grade"],
                    "pos": e["data"].get("pos") or "OTHER",
                    "source_sentence": e["data"].get("source_sentence"),
                }
                card.append(event)
            elif e["type"] in ["read_event"]:
                event = {
                    "type": e["type"],
                    "source": e["source"],
                    "user_stats_mode": e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
                    "user_id": current_user.id,
                    "content_id": e["data"]["content_id"],
                    "href": e["data"]["href"],
                    # "href": e["data"].get("href"),
                    "model_id": e["data"]["model_id"],
                    "read_at": e["data"]["read_at"],
                }
                read.append(event)
            else:
                event = {
                    "type": e["type"],
                    "source": e["source"],
                    "user_stats_mode": e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
                    "user_id": current_user.id,
                    "target_word": e["data"]["target_word"],
                    "target_sentence": e["data"].get("target_sentence"),
                }
                other.append(event)
        if activities:
            await aioproducer.send_and_wait(stats.ACTIVITY_EVENT_TOPIC_NAME, orjson.dumps(activities))
        if vocab:
            await aioproducer.send_and_wait(stats.VOCAB_EVENT_TOPIC_NAME, orjson.dumps(vocab))
        if card:
            await aioproducer.send_and_wait(stats.CARD_EVENT_TOPIC_NAME, orjson.dumps(card))
        if read:
            await aioproducer.send_and_wait(stats.READ_EVENT_TOPIC_NAME, orjson.dumps(read))
        if other:
            await aioproducer.send_and_wait(stats.ACTION_EVENT_TOPIC_NAME, orjson.dumps(other))

    except Exception as ex:  # pylint: disable=W0703  # FIXME:
        logger.exception(ex)
        logger.exception(e)
        return {"status": "failure"}

    return {"status": "success"}


@router.get("/langs", name="langs")
async def available_languages():
    return JSONResponse(list(settings.LANG_PAIRS.keys()))


async def get_content_response(destination, resource_path, user_agent: str):
    destination_no_data_suffix = destination.removesuffix(DATA_JS_SUFFIX).removesuffix(DATA_JSON_SUFFIX)
    is_data_file_request = destination.endswith(DATA_JS_SUFFIX) or destination.endswith(DATA_JSON_SUFFIX)

    if not os.path.isfile(destination_no_data_suffix):
        logger.warning(f"Can't find {destination_no_data_suffix=}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource specified is not a file {resource_path=}",
        )

    if not is_data_file_request:
        media_type = mimetypes.guess_type(destination)[0]
        if media_type == "application/xhtml+xml":
            # https://caniuse.com/?search=script%3A%20type%3A%20module
            # Safari is broken with "application/xhtml+xml"...
            ua = parse(user_agent)
            if ua and "safari" in ua.browser.family.lower():
                media_type = "text/html"
        response = FileResponse(destination, media_type=media_type)
        return response

    parse_path = f"{destination_no_data_suffix}{PARSE_JSON_SUFFIX}"
    enrich_path = f"{destination_no_data_suffix}{ENRICH_JSON_SUFFIX}"

    if not os.path.isfile(parse_path) or not os.path.isfile(enrich_path):
        logger.warning(f"Can't find {parse_path=} or {enrich_path=}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource specified is not a file {resource_path=}",
        )

    with open(parse_path, encoding="utf8") as parse_file:
        combined = json.load(parse_file)

        if os.path.isfile(enrich_path):
            with open(enrich_path, encoding="utf8") as enrich_file:
                enrich = json.load(enrich_file)
                for parse_id, text_parse in combined.items():
                    for sindex, sentence in enumerate(text_parse["s"]):
                        if "l1" in enrich[parse_id]["s"][sindex]:
                            sentence["l1"] = enrich[parse_id]["s"][sindex]["l1"]
                        for tindex, token in enumerate(sentence["t"]):
                            for prop, value in enrich[parse_id]["s"][sindex]["t"][tindex].items():
                                token[prop] = value

        if destination.endswith(DATA_JS_SUFFIX):
            content = f'var transcrobesModel = {json.dumps(combined, separators=(",", ":"))};'
            content_length = str(len(content))

            # TODO: decide whether to keep this.
            # Here we calculate the file stats from file dates, so normal browser caching works
            # This may be dangerous/annoying but if we want to not cache at all then we'll need
            # to get rid of these header in the FileResponse above, or they *will* get cached
            # and this *won't*
            mtime = os.path.getmtime(destination_no_data_suffix)
            etag_base = str(mtime) + "-" + content_length
            etag = hashlib.md5(etag_base.encode()).hexdigest()

            resp = Response(
                content=content,
                media_type="text/javascript",
            )
            resp.headers.setdefault("content-length", content_length)
            resp.headers.setdefault("last-modified", formatdate(mtime, usegmt=True))
            resp.headers.setdefault("etag", etag)
            return resp
        else:
            return JSONResponse(combined)


@router.get("/sharedcontent/{resource_path:path}", name="serve_shared_content")
async def serve_shared_content(  # pylint: disable=R0914  # FIXME: consider reducing
    resource_path: str,
    # current_user: models.AuthUser = Depends(deps.get_current_good_user),
    current_user: models.AuthUser = Depends(deps.get_current_good_tokenpayload),
    user_agent: Annotated[str | None, Header()] = None,
):
    destination = absolute_resources_path(SHARED_USER_ID, resource_path)
    return await get_content_response(destination, resource_path, user_agent)


@router.get("/content/{resource_path:path}", name="serve_content")
async def serve_content(  # pylint: disable=R0914  # FIXME: consider reducing
    resource_path: str,
    # current_user: models.AuthUser = Depends(deps.get_current_good_user),
    current_user: models.AuthUser = Depends(deps.get_current_good_tokenpayload),
    user_agent: Annotated[str | None, Header()] = None,
):
    destination = absolute_resources_path(current_user.id, resource_path)
    return await get_content_response(destination, resource_path, user_agent)
