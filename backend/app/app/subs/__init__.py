import logging

from app.models.data import Content, StreamDetails
from sqlalchemy import and_, select
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)


async def search_db_for_streamdetails(db, stream_details: StreamDetails, media_lang: str):
    stmt = (
        select(StreamDetails)
        .join(Content, StreamDetails.contents)
        .where(
            and_(
                StreamDetails.streamer == stream_details.streamer,
                StreamDetails.streamer_id == stream_details.streamer_id,
                Content.language == media_lang,
            )
        )
        .options(joinedload(StreamDetails.contents))
    )
    result = await db.execute(stmt)
    return result.scalars().first()
