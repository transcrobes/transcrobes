import asyncio
from typing import Any

import asyncpg

from .._base import Event
from .base import BroadcastBackend


class PostgresBackend(BroadcastBackend):
    def __init__(self, url: str):
        self._url: str = url
        self._conn: asyncpg.connection.Connection = None
        self._pool: asyncpg.pool.Pool = None

    async def connect(self) -> None:
        await self.ensure_connection()
        await self.ensure_pool()
        self._listen_queue: asyncio.Queue = asyncio.Queue()

    async def ensure_pool(self) -> None:
        if not self._pool:
            self._pool = await asyncpg.create_pool(self._url, min_size=3, max_size=50)  # don't waste resources?

    async def ensure_connection(self) -> None:
        if not self._conn or self._conn.is_closed():
            self._conn = await asyncpg.connect(self._url)

    async def disconnect(self) -> None:
        if self._conn and not self._conn.is_closed():
            await self._conn.close()

    async def subscribe(self, channel: str) -> None:
        await self.ensure_connection()
        await self._conn.add_listener(channel, self._listener)

    async def unsubscribe(self, channel: str) -> None:
        await self.ensure_connection()
        await self._conn.remove_listener(channel, self._listener)

    async def publish(self, channel: str, message: str) -> None:
        await self.ensure_pool()
        async with self._pool.acquire() as conn:
            await conn.execute("SELECT pg_notify($1, $2);", channel, message)

    def _listener(self, *args: Any) -> None:
        _connection, _pid, channel, payload = args
        event = Event(channel=channel, message=payload)
        self._listen_queue.put_nowait(event)

    async def next_published(self) -> Event:
        return await self._listen_queue.get()
