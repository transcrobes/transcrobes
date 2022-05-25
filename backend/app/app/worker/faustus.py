import os
from pathlib import Path

import faust
from app.core.config import settings
from app.schemas.files import ProcessData

Path(settings.LOCAL_DATA_ROOT).mkdir(parents=True, exist_ok=True)

app = faust.App(
    "transcrobes",
    broker="kafka://" + settings.KAFKA_BROKER,
    store="rocksdb://",
    datadir=os.path.join(settings.LOCAL_DATA_ROOT, "datadir"),
    tabledir=os.path.join(settings.LOCAL_DATA_ROOT, "tabledir"),
    web_port=settings.FAUST_PORT,
    producer_max_request_size=settings.FAUST_PRODUCER_MAX_REQUEST_SIZE,
    consumer_max_fetch_size=settings.CONSUMER_MAX_FETCH_SIZE,
)

content_process_topic = app.topic("content_process_topic", value_type=ProcessData)
list_process_topic = app.topic("list_process_topic", value_type=ProcessData)


class UserDayT(faust.Record, serializer="json"):  # pylint: disable=W0223
    nb_seen: int = 0
    nb_checked: int = 0
    nb_success: int = 0
    nb_failures: int = 0
    updated_at: float = 0


class UserWordT(faust.Record, serializer="json"):  # pylint: disable=W0223
    nb_seen: int = 0
    last_seen: float = 0
    nb_checked: int = 0
    last_checked: float = 0
    nb_seen_since_last_check: int = 0
    is_known: int = 0
    updated_at: float = 0


class UserWords(faust.Record, serializer="json", validation=True):  # pylint: disable=W0223
    words: dict[str, UserWordT] = {}
    days: dict[int, UserDayT] = {}
    ordered_keys: list[str] = []  # ordered by updated_at desc
    ordered_day_keys: list[str] = []  # ordered by updated_at desc


user_words = app.Table(
    "user_words",
    default=UserWords,
    key_type=str,
    value_type=UserWords,
)
