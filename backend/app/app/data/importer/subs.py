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
from pysubs2.exceptions import ContentNotUsable
from pysubs2.ssastyle import SSAStyle
from pysubs2.substation import parse_tags
from sqlalchemy.ext.asyncio.session import AsyncSession
from webvtt import Caption, WebVTT

logger = logging.getLogger(__name__)


# FIXME: monkeypatch pysubs2 until https://github.com/tkarabela/pysubs2/pull/68 is merged
@classmethod
def to_file(cls, subs, fp, format_, apply_styles=True, keep_ssa_tags=False, **kwargs):
    def prepare_text(text: str, style: SSAStyle):
        text = text.replace(r"\h", " ")
        text = text.replace(r"\n", "\n")
        text = text.replace(r"\N", "\n")

        body = []
        if keep_ssa_tags:
            body.append(text)
        else:
            for fragment, sty in parse_tags(text, style, subs.styles):
                if apply_styles:
                    if sty.italic:
                        fragment = f"<i>{fragment}</i>"
                    if sty.underline:
                        fragment = f"<u>{fragment}</u>"
                    if sty.strikeout:
                        fragment = f"<s>{fragment}</s>"
                if sty.drawing:
                    raise ContentNotUsable
                body.append(fragment)

        return re.sub("\n+", "\n", "".join(body).strip())

    visible_lines = sorted((line for line in subs if not line.is_comment), key=lambda line: line.start)

    lineno = 1
    for line in visible_lines:
        start = cls.ms_to_timestamp(line.start)
        end = cls.ms_to_timestamp(line.end)
        try:
            text = prepare_text(line.text, subs.styles.get(line.style, SSAStyle.DEFAULT_STYLE))
        except ContentNotUsable:
            continue

        print(lineno, file=fp)
        print(start, "-->", end, file=fp)
        print(text, end="\n\n", file=fp)
        lineno += 1


pysubs2.subrip.SubripFormat.to_file = to_file


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
