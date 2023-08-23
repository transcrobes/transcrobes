import logging

import anyio
import jose
import jwt
from app import models, schemas
from app.api import deps
from app.api.api_v1 import types
from app.api.api_v1.graphql import filter_wordlists
from app.core import security
from app.core.config import settings
from app.data.context import get_broadcast
from app.data.filter import (
    filter_cached_definitions,
    filter_cards,
    filter_day_model_stats,
    filter_standard,
    filter_word_model_stats,
    get_standard_rows,
    get_user,
)
from app.enrich.cache import def_dict_to_sqlite3
from app.ndutils import get_from_lang
from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)


def get_cookie_good_tokenpayload(
    token: str,
):
    print("my token has got to be", token)
    if token is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = schemas.TokenPayload(**payload)
    except jose.exceptions.ExpiredSignatureError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    if not token_data.is_active or not token_data.is_verified:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    return token_data


@router.get("/{table_name}/{row_id}/{updated_at}")
async def dbupdates(
    table_name: str,
    row_id: str,
    updated_at: float,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    row_id = row_id if row_id != "null" else ""
    LIMIT = 100000
    from_lang = get_from_lang(current_user.lang_pair)
    data = {}
    # TODO:
    # types.Studentregistrations.__name__
    # types.Teacherregistrations.__name__
    # types.Languageclasses.__name__
    # types.Persons.__name__

    # TODO: we can delete when there is a deletion!!!

    if table_name == types.Definitions.__name__:
        user = await get_user(db, request)  # raises exception if no logged in user
        raw_defs = await filter_cached_definitions(db, user, LIMIT, id=row_id, updated_at=updated_at)
        final_defs = []
        for raw_def in raw_defs:
            dict_obj = types.asdict_inner(raw_def)
            del dict_obj["deleted"]
            adef = def_dict_to_sqlite3(dict_obj)
            final_defs.append(
                {
                    "id": int(adef[0]),
                    "graph": adef[1],
                    "sound": adef[2],
                    "synonyms": adef[3],
                    "provider_translations": adef[4],
                    "wcpm": adef[5],
                    "wcdp": adef[6],
                    "pos": adef[7],
                    "pos_freq": adef[8],
                    "hsk": adef[9],
                    "fallback_only": 1 if adef[10] else 0,
                    "updated_at": adef[11],
                }
            )
        data[types.Definitions.__name__] = final_defs
    elif table_name == types.camel_to_snake(types.WordModelStats.__name__):
        data[types.camel_to_snake(types.WordModelStats.__name__)] = await filter_word_model_stats(
            current_user.id, current_user.lang_pair, LIMIT, id=row_id, updated_at=updated_at
        )
    elif table_name == types.camel_to_snake(types.DayModelStats.__name__):
        data[types.camel_to_snake(types.DayModelStats.__name__)] = await filter_day_model_stats(
            current_user.id, LIMIT, updated_at=updated_at
        )
    elif table_name == types.Cards.__name__:
        output = []
        documents = await filter_cards(
            db,
            current_user.id,
            LIMIT,
            id=row_id,
            updated_at=updated_at,
        )
        for doc in documents:
            if not doc.deleted:
                output.append(doc)
        data[types.Cards.__name__] = output
    elif table_name == types.Userdictionaries.__name__:
        output = []
        stdReturn = await filter_standard(
            db,
            current_user.id,
            LIMIT,
            types.Userdictionaries,
            models.UserDictionary,
            id=row_id,
            updated_at=updated_at,
        )
        for doc in stdReturn.documents:
            if not doc.deleted:
                output.append(doc)
        data[types.Userdictionaries.__name__] = output
    elif table_name == types.Imports.__name__:
        output = []
        for imp in await get_standard_rows(
            db,
            current_user.id,
            LIMIT,
            types.Imports,
            models.Import,
            id=row_id,
            updated_at=updated_at,
        ):
            # if imp.created_at == imp.updated_at:
            output.append({"id": imp.id, "updated_at": imp.updated_at.timestamp(), "analysis": imp.analysis})
        data[types.Imports.__name__] = output
    elif table_name == types.Userlists.__name__ or table_name == types.Wordlists.__name__:
        # FIXME: actually, we only care about updating the name, so it's a bit of a shame to
        # do all the work we do just for that... otherwise, we could just get the inserts
        output = []
        documents = await filter_wordlists(db, current_user.id, from_lang, LIMIT, updated_at=updated_at)
        for doc in documents:
            if not doc.deleted:
                output.append(doc)
        data[types.Wordlists.__name__] = output
    return data


async def dbupdates_ws_receiver(websocket: WebSocket, user_id: str):
    async for message in websocket.iter_text():
        await (await get_broadcast()).publish(channel="changed" + str(user_id), message=message)


# FIXME: the next two methods were copy/pasted and should be refactored
@router.websocket("/collections_updates/{token}")
async def collections_updates(websocket: WebSocket, token: str):
    current_user = get_cookie_good_tokenpayload(websocket.cookies.get("session") or token)
    await websocket.accept()
    async with anyio.create_task_group() as task_group:

        async def run_collections_ws_receiver() -> None:
            await dbupdates_ws_receiver(websocket=websocket, user_id=current_user.id)
            task_group.cancel_scope.cancel()

        task_group.start_soon(run_collections_ws_receiver)
        await collections_ws_sender(websocket, user_id=current_user.id)


@router.websocket("/definitions_updates/{token}")
async def definitions_updates(websocket: WebSocket, token: str):
    current_user = get_cookie_good_tokenpayload(websocket.cookies.get("session") or token)
    await websocket.accept()
    await definitions_ws_sender(websocket, user_id=current_user.id)


async def collections_ws_sender(websocket: WebSocket, user_id: str):
    async with (await get_broadcast()).subscribe(channel=f"changed{user_id}") as subscriber:
        async for event in subscriber:
            if event.message in [
                types.camel_to_snake(types.WordModelStats.__name__),
                types.camel_to_snake(types.DayModelStats.__name__),
                types.Cards.__name__,
                types.Userdictionaries.__name__,
                types.Imports.__name__,
                types.Wordlists.__name__,
            ]:
                await websocket.send_text(event.message)


async def definitions_ws_sender(websocket: WebSocket, user_id: str):
    async with (await get_broadcast()).subscribe(channel=f"definition{types.Definitions.__name__}") as subscriber:
        async for event in subscriber:
            await websocket.send_text(event.message)
