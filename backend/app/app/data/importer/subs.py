import json
import logging
import os
import re
import shutil
import string

import pysubs2
import webvtt
from app.core.config import settings
from app.data.importer import get_or_create_content
from app.data.models import ASS_EXTENSION, PARSE_JSON_SUFFIX, VTT_EXTENSION, WEBVTT_FILE
from app.enrich import enrich_plain_to_html
from app.enrich.data import EnrichmentManager
from app.models.data import Content, Import
from app.ndutils import gather_with_concurrency, to_enrich
from sqlalchemy.ext.asyncio.session import AsyncSession
from webvtt import Caption, WebVTT

logger = logging.getLogger(__name__)


async def process_subs(db: AsyncSession, the_import: Import, manager: EnrichmentManager):
    content = get_or_create_content(the_import)
    content.the_import = the_import
    content.created_by = the_import.created_by
    content.updated_by = the_import.created_by
    content.content_type = Content.VIDEO
    if not content.title:
        content.title = the_import.title
    if not content.description:
        content.description = the_import.description
    # content.cover = cover
    content.language = content.created_by.from_lang

    db.add(content)
    await db.commit()
    # Reinit destination dir
    directory = content.processed_path()
    if os.path.isdir(directory):
        logger.debug("Erasing existing content in %s", directory)
        shutil.rmtree(directory, ignore_errors=True)
    os.makedirs(directory)

    filepath = the_import.imported_path()
    # TODO: we can do much more, and much better here... but for the moment we'll just use this
    if filepath.endswith(ASS_EXTENSION):
        subs = pysubs2.load(filepath, encoding="utf-8")
        filepath = filepath.removesuffix(ASS_EXTENSION) + VTT_EXTENSION
        subs.save(filepath)

    parsed = webvtt.read(filepath) if filepath.endswith(VTT_EXTENSION) else webvtt.from_srt(filepath)

    for caption in parsed:
        if not caption.text:
            continue
        lines = caption.text.splitlines()
        newText = []
        for line in lines:
            text = manager.enricher().clean_text(line)
            punct_cleaned = text.translate(str.maketrans("", "", string.punctuation))
            if not re.search(r"\S+", punct_cleaned) or not to_enrich(punct_cleaned, manager.from_lang):
                continue
            newText.append(text)
        caption.text = "\n".join(newText)

    plain_futures = [
        enrich_plain_to_html(
            f"{caption.start}*{caption.end}",
            caption.text,
            manager,
        )
        for caption in parsed
    ]
    processed_cues = await gather_with_concurrency(
        settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
        *(plain_futures),
    )

    vtt = WebVTT()
    cue_models = {}
    for cue in sorted(processed_cues, key=lambda i: i[0]):
        vtt.captions.append(Caption(cue[0].split("*")[0], cue[0].split("*")[1], cue[1]))
        cue_models.update(cue[2])

    outpath = os.path.join(directory, WEBVTT_FILE)
    vtt.save(outpath)
    with open(f"{outpath}{PARSE_JSON_SUFFIX}", "w+", encoding="utf8") as webvtt_parse:
        json.dump(cue_models, webvtt_parse, separators=(",", ":"))

    return [cue_models]
