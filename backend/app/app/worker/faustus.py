import faust
from app.core.config import settings
from app.schemas.files import ProcessData

app = faust.App(
    "transcrobes",
    broker="kafka://" + settings.KAFKA_BROKER,
    producer_max_request_size=settings.FAUST_PRODUCER_MAX_REQUEST_SIZE,
    consumer_max_fetch_size=settings.CONSUMER_MAX_FETCH_SIZE,
)

# Tasks
content_process_topic = app.topic("content_process_topic", value_type=ProcessData)
list_process_topic = app.topic("list_process_topic", value_type=ProcessData)
import_process_topic = app.topic("import_process_topic", value_type=ProcessData)
