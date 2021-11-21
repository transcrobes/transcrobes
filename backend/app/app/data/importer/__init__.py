# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import csv
import glob
import json  # import orjson as json
import logging
import os
import posixpath
import re
import shutil
import time
from collections import ChainMap, Counter, defaultdict
from datetime import datetime
from itertools import chain
from pathlib import Path
from zipfile import ZipFile

import aiofiles
import dawn
import magic
import pytz
import webvtt
from app.core.config import settings
from app.data.context import get_broadcast
from app.data.models import (
    DATA_JS_SUFFIX,
    ENRICH_JSON_SUFFIX,
    ERROR,
    FINISHED,
    MANIFEST_JSON,
    PARSE_JSON_SUFFIX,
    SRT_EXTENTION,
    VTT_EXTENTION,
    WEBVTT_FILE,
)
from app.db.session import async_session
from app.enrich.data import EnrichmentManager, managers
from app.enrich.models import ensure_cache_preloaded
from app.models.migrated import Content, Import, UserList
from app.models.user import absolute_imports_path
from app.ndutils import lemma, to_enrich
from app.schemas.files import ProcessData
from app.zhhans import CORENLP_IGNORABLE_POS
from bs4 import BeautifulSoup
from dawn.epub import Epub
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from webvtt import Caption, WebVTT

logger = logging.getLogger(__name__)


# stolen from django.contrib.admin.utils...
def flatten(fields):
    """
    Return a list which is a single level of flattening of the original list.
    """
    flat = []
    for field in fields:
        if isinstance(field, (list, tuple)):
            flat.extend(field)
        else:
            flat.append(field)
    return flat


# FOR WEBPUB
def get_metadata_item(book, name):
    item = book.meta.get(name)
    if item:
        if isinstance(item, list):
            if len(item) > 0:
                return str(item[0])
        else:
            return str(item)
    return None


def adjust_href(epub, href):
    """Take href relative to OPF and make it relative to the EPUB root dir."""
    opfdir = posixpath.dirname(epub._opfpath)  # pylint: disable=W0212
    return posixpath.join(opfdir, href)


def make_contributor(val):
    result = []
    for v in val:
        item = {"name": str(v.value)}
        if v.data.get("role"):
            item["role"] = v.data.get("role")
        if v.data.get("file=as"):
            item["sortAs"] = v.data.get("file-as")
        result.append(item)
    return result


def make_toc_item(epub, it):
    res = {"href": adjust_href(epub, it.href), "title": it.title}
    if it.children:
        res["children"] = [make_toc_item(epub, c) for c in it.children]
    return res


def make_manifest(epub: Epub):  # noqa:C901  # pylint: disable=R0912
    data = {
        "@context": "https://readium.org/webpub-manifest/context.jsonld",
        "metadata": {
            "@type": "http://schema.org/Book",
        },
        "readingOrder": [],
        "resources": [],
    }

    # METADATA
    for k, v in epub.meta.items():
        # logger.debug('Found metadata key: %s, val: %s' % (k, repr(v)))
        if v:
            metadata = data["metadata"]
            if k == "dates":
                metadata["modified"] = str(epub.meta.get("dates").get("modification"))
            elif k == "titles":
                metadata["title"] = str(v[0].value)
                if v[0].data.get("file-as"):
                    metadata["sortAs"] = v[0].data.get("file-as")
            elif k == "contributors":
                metadata["contributor"] = make_contributor(v)
            elif k == "creators":
                metadata["author"] = make_contributor(v)
            elif k.endswith("s"):
                if len(v) > 1:
                    metadata[k[:-1]] = [str(x) for x in v]
                else:
                    metadata[k[:-1]] = str(v[0])
            else:
                metadata[k] = str(v)

    # READING ORDER
    ro = data["readingOrder"]

    for s in epub.spine:
        ro.append(
            {
                "href": adjust_href(epub, s.href),
                "type": s.mimetype
                # TODO: properties.contains = ['svg']
            }
        )

    # RESOURCES
    resources = data["resources"]
    for k, v in epub.manifest.items():
        res = {"href": adjust_href(epub, v.href), "type": v.mimetype}
        if v is epub.cover:
            res["rel"] = "cover"
        resources.append(res)

    # TOC
    data["toc"] = [make_toc_item(epub, it) for it in epub.toc]

    return data


def get_or_create_content(the_import: Import) -> Content:
    return the_import.content or Content()


async def unpack_epub_file(db: AsyncSession, the_import: Import):  # pylint: disable=R0914

    import_path = absolute_imports_path(the_import.created_by.id, the_import.import_file)
    with open(import_path, "rb") as f, dawn.open(f) as upload:
        manifest = make_manifest(upload)
        title = get_metadata_item(upload, "titles") or ""
        author = get_metadata_item(upload, "creators") or ""
        description = get_metadata_item(upload, "description") or ""
        language = get_metadata_item(upload, "language") or ""
        mod_date = upload.meta.get("dates").get("modification") or None

        # Date, if provided should be UTC according to spec.
        if mod_date:
            mod_date = pytz.utc.localize(mod_date)
        else:
            # Many EPUBs are missing this metadata, unfortunately.
            logger.warning("No mod date found in %s", the_import)
            mod_date = datetime.utcnow().replace(tzinfo=pytz.utc)

        if upload.cover:
            cover = adjust_href(upload, upload.cover.href)
            # For cover path, need to prefix this path with the directory holding this version of the book.
            # cover = os.path.join(str(sort_order), cover)
        else:
            cover = None

        content = get_or_create_content(the_import)
        content.the_import = the_import
        content.created_by = the_import.created_by
        content.updated_by = the_import.created_by
        content.content_type = Content.BOOK
        content.title = title
        content.author = author
        content.description = description
        content.cover = cover
        content.language = language

        db.add(content)
        await db.commit()

        # Unpack the EPUB file
        directory = (
            content.processed_path()
        )  # ??? os.path.dirname(the_import.created_by.user_resources_path(the_import.import_file))

        if os.path.isdir(directory):
            logger.debug("Erasing existing content in %s", directory)
            shutil.rmtree(directory, ignore_errors=True)
        os.makedirs(directory)
        with ZipFile(import_path) as zf:
            zf.extractall(path=directory)
        with open(os.path.join(directory, MANIFEST_JSON), "w", encoding="utf8") as mf:
            mf.write(json.dumps(manifest, indent=4))
        logger.debug("Unpacked epub into %s", directory)
        return content


# END FOR WEBPUB


async def gather_with_concurrency(n, *tasks):
    semaphore = asyncio.Semaphore(n)

    async def sem_task(task):
        async with semaphore:
            return await task

    return await asyncio.gather(*(sem_task(task) for task in tasks))


def chunked(size, source):
    for i in range(0, len(source), size):
        yield source[i : i + size]  # noqa: E203


# FIXME: this is currently useless, probably better to delete
def text_from_text_file(contents):
    return contents


async def enrich_html_to_html(chapter_id, xhtml, lang_pair):
    manager = managers.get(lang_pair)
    if not manager:
        raise NotImplementedError(f"Server does not support language pair {lang_pair}")

    soup = BeautifulSoup(xhtml, "html.parser")  # it appears only html.parser doesn't fail when there are BOM :-(
    if not soup.head.title:  # html MUST have a head->title
        soup.head.append(soup.new_tag("title"))
        soup.head.title.string = "Title"

    data_json = soup.new_tag("script")
    data_json["src"] = f"{os.path.basename(chapter_id)}{DATA_JS_SUFFIX}"
    soup.head.append(data_json)

    text_nodes = soup.body.find_all(text=True)
    slim_models = {}
    for text_node in text_nodes:
        text = manager.enricher().clean_text(str(text_node))

        if not re.search(r"\S+", text) or not to_enrich(text):
            continue

        logger.debug(f"Starting parse for {chapter_id}: {text[:100]}")
        parse = await manager.parser().parse(text)
        parsed_slim_model = {"s": manager.enricher().slim_parse(parse)}

        match = re.match(r"^\s+", text)
        if match:
            parsed_slim_model["sws"] = match.group(0)
        match = re.search(r"\s+$", text)
        if match:
            parsed_slim_model["ews"] = match.group(0)

        timestamp = time.time_ns()
        text_fragment = soup.new_tag("enriched-text-fragment")
        text_fragment["id"] = timestamp
        text_fragment.string = text
        slim_models[timestamp] = parsed_slim_model
        text_node.replace_with(text_fragment)

    return chapter_id, str(soup), slim_models


async def enrich_plain_to_html(unique_key, start_text, lang_pair):
    manager = managers.get(lang_pair)
    if not manager:
        raise NotImplementedError(f"Server does not support language pair {lang_pair}")

    lines = ""
    slim_models = {}
    text_node = manager.enricher().clean_text(str(start_text))

    for raw_line in text_node.splitlines():
        text = "".join(c for c in raw_line.strip() if c.isprintable())
        if not re.search(r"\S+", text) or not to_enrich(text):
            template_string = text.strip()
        else:
            logger.debug(f"Starting parse for {unique_key}: {text[:100]}")
            parsed_slim_model = {"s": manager.enricher().slim_parse(await manager.parser().parse(text))}

            match = re.match(r"^\s+", text)
            if match:
                parsed_slim_model["sws"] = match.group(0)
            match = re.search(r"\s+$", text)
            if match:
                parsed_slim_model["ews"] = match.group(0)

            timestamp = time.time_ns()
            template_string = f"<enriched-text-fragment id='{timestamp}'>{text}<enriched-text-fragment>"
            slim_models[timestamp] = parsed_slim_model

        lines += f"<br>{template_string}" if (lines and text.startswith("-")) else template_string

    return unique_key, lines, slim_models


async def process_subs(db: AsyncSession, the_import: Import):

    content = get_or_create_content(the_import)
    content.the_import = the_import
    content.created_by = the_import.created_by
    content.updated_by = the_import.created_by
    content.content_type = Content.VIDEO
    content.title = the_import.title
    content.description = the_import.description
    # content.cover = cover
    # content.language = language

    db.add(content)
    await db.commit()
    # Reinit destination dir
    directory = content.processed_path()
    if os.path.isdir(directory):
        logger.debug("Erasing existing content in %s", directory)
        shutil.rmtree(directory, ignore_errors=True)
    os.makedirs(directory)

    filepath = the_import.imported_path()
    parsed = webvtt.read(filepath) if filepath.endswith(VTT_EXTENTION) else webvtt.from_srt(filepath)

    plain_futures = [
        enrich_plain_to_html(
            f"{caption.start}*{caption.end}",
            caption.text,
            the_import.created_by.lang_pair,
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

    outpath = os.path.join(content.processed_path(), WEBVTT_FILE)
    vtt.save(outpath)
    with open(f"{outpath}{PARSE_JSON_SUFFIX}", "w+", encoding="utf8") as webvtt_parse:
        json.dump(cue_models, webvtt_parse, separators=(",", ":"))

    return [cue_models]


async def process_epub_to_webpub(db: AsyncSession, the_import: Import):
    content = await unpack_epub_file(db, the_import)
    with open(os.path.join(content.processed_path(), MANIFEST_JSON), encoding="utf8") as epubfile:
        manifest = json.load(epubfile)
    chapters = {}
    for resource_file in manifest["resources"]:
        if resource_file.get("type") and "xhtml" in resource_file["type"]:
            with open(os.path.join(content.processed_path(), resource_file["href"]), encoding="utf8") as file_contents:
                chapters[resource_file["href"]] = file_contents.read()

    xhtml_futures = [
        enrich_html_to_html(chapter_id, chapter, the_import.created_by.lang_pair)
        for chapter_id, chapter in chapters.items()
    ]

    processed_chapters = await gather_with_concurrency(
        settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
        *(xhtml_futures),
    )
    chapter_models = []
    for chapter in processed_chapters:
        with open(os.path.join(content.processed_path(), chapter[0]), "w+", encoding="utf8") as replacement, open(
            os.path.join(content.processed_path(), f"{chapter[0]}{PARSE_JSON_SUFFIX}"),
            "w+",
            encoding="utf8",
        ) as parse:
            replacement.write(chapter[1])
            json.dump(chapter[2], parse, separators=(",", ":"))
        chapter_models.append(chapter[2])

    return chapter_models


def text_from_import(an_import):
    # We should only have valid files here, but should probably add more checking anyway

    with open(an_import.imported_path(), encoding="utf8") as fh:
        contents = fh.read()
        tester = magic.Magic(mime=True, mime_encoding=True)
        file_type, _file_encoding = tester.from_buffer(
            contents[0 : settings.IMPORT_DETECT_CHUNK_SIZE_BYTES]  # noqa: E203
        ).split("; charset=")

        # FIXME: do some check that we have utf8 - and maybe also check that there are Chinese chars?
        # also check for only simplifieds?

        if file_type in ["text/plain", "application/csv"]:
            return text_from_text_file(contents)
        # elif file_type in ['application/pdf', ...]:
        #     return text_from_other...
        raise Exception(f"Attempt to import from unsupported file_type {file_type}")


class VocabularyCounter(Counter):  # pylint: disable=W0223
    pass


class GrammarRuleCounter(Counter):  # pylint: disable=W0223
    pass


async def vocabulary_from_model(model):
    # TODO: consider removing the first and last word if settings.IMPORT_PARSE_CHUNK_SIZE_BYTES
    # as it might have got half of a character (which can be more than one byte and we split on
    # bytes, not chars, at least for now!

    # this allows analysing pure CoreNLP models and enriched models
    sentences = model.get("s") or model.get("sentences")
    if not sentences:
        sentences = list(chain(*[m.get("s") or m for m in model.values()]))

    pos_tag = "pos"
    vocabulary = VocabularyCounter()
    for sentence in sentences:
        for token in sentence.get("t") or sentence["tokens"]:
            # WARNING!!!
            # this has the effect of removing LOTS of Chinese time and number words/expressions
            # At the moment this looks like a good idea because we really don't want "words" like
            # 千万分之一, which is a "word" according to CoreNLP. It is entirely predictable from
            # the parts, and we definitely don't need to consider this something that might need
            # to be added to Anki, or that it should be included in known word counts, considered
            # when calculating difficulty, etc.
            # TODO: consider making this configurable
            if pos_tag in token and token[pos_tag] not in CORENLP_IGNORABLE_POS:
                vocabulary[lemma(token)] += 1
    return vocabulary


async def grammar_rules_from_model(_model):
    # TODO: Do, and don't forget to remove the first and last sentences if the size
    # of the block is the same as settings.IMPORT_PARSE_CHUNK_SIZE_BYTES because we will have split
    # sentences, which might have borked grammatical structures
    return None


async def model_from_chunk(
    manager: EnrichmentManager, chunk: str, process_type: int
):  # FIXME: there is a clean way of doing enums now...
    logger.debug("Sending chunk to the parser %s", chunk[0:100])
    # FIXME: find some way to deal with process_type elegantly...
    # depparse is very expensive, only do if necessary
    annotators = "lemma" + (",depparse" if process_type in [Import.GRAMMAR_ONLY, Import.VOCABULARY_GRAMMAR] else "")
    params = f'{{"annotators":"{annotators}","ssplit.newlineIsSentenceBreak":"always","outputFormat":"json"}}'
    model = await manager.parser().parse(chunk, provider_parameters=params)
    return model


async def analysis_from_model(model, process_type):
    awaitables = []
    if process_type in [Import.VOCABULARY_ONLY, Import.VOCABULARY_GRAMMAR]:
        awaitables.append(vocabulary_from_model(model))
    if process_type in [Import.GRAMMAR_ONLY, Import.VOCABULARY_GRAMMAR]:
        awaitables.append(grammar_rules_from_model(model))

    return await asyncio.gather(*awaitables)


async def process(flat_models, process_type):
    vocabulary = []
    grammar_rules = []
    model_stats = [await analysis_from_model(model, process_type) for model in flat_models]
    for model_stat in model_stats:
        for stat in model_stat:
            if isinstance(stat, VocabularyCounter):
                vocabulary.append(stat)
            elif isinstance(stat, GrammarRuleCounter):
                grammar_rules.append(stat)
    merged_vocabulary = sum(vocabulary or [], VocabularyCounter())
    merged_grammar_rules = sum(grammar_rules or [], GrammarRuleCounter())

    analysis = {}
    if process_type in [Import.VOCABULARY_ONLY, Import.VOCABULARY_GRAMMAR]:
        # TODO: optimise
        frequency_buckets = defaultdict(list)
        for k, v in sorted(merged_vocabulary.items()):
            frequency_buckets[v].append(k)

        frequency_counts = Counter({k: len(v) for k, v in frequency_buckets.items()})

        analysis["vocabulary"] = {
            "buckets": frequency_buckets,
            "counts": frequency_counts,
        }
    if process_type in [Import.GRAMMAR_ONLY, Import.VOCABULARY_GRAMMAR]:
        analysis["grammar_rules"] = merged_grammar_rules

    return analysis


async def enrich_parse(content: Content, manager: EnrichmentManager):
    logger.info("Enriching parse for content %s on path %s", content, content.processed_path())
    # TODO: think about doing all files in parallel, not just all fragments
    for fname in glob.glob(
        os.path.join(content.processed_path(), f"**/*{PARSE_JSON_SUFFIX}"),
        recursive=True,
    ):
        logger.debug("Enriching content file %s", fname)
        with open(os.path.join(fname), encoding="utf8") as file_contents:
            file_models = json.load(file_contents)
            model_futures = [
                manager.enricher().enrich_parse_to_aids_json(
                    timestamp, model, manager, translate_sentence=False, best_guess=True, deep_transliterations=False
                )
                for timestamp, model in file_models.items()
            ]

        processed_files_list = await gather_with_concurrency(
            settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
            *(model_futures),
        )

        processed_files_dict = dict(ChainMap(*processed_files_list))  # re-merge dicts from list

        with open(re.sub(f"{PARSE_JSON_SUFFIX}$", ENRICH_JSON_SUFFIX, fname), "w+", encoding="utf8") as file_contents:
            json.dump(processed_files_dict, file_contents, separators=(",", ":"))


async def models_from_import(db: AsyncSession, an_import: Import, lang_pair: str):
    manager = managers.get(lang_pair)
    if not manager:
        raise NotImplementedError(f"Server does not support language pair {lang_pair}")
    output_dir = os.path.dirname(an_import.processed_path())
    if an_import.import_file.endswith(".epub"):
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        models = await process_epub_to_webpub(db, an_import)
        logger.debug("%s models found for epub import %s", len(models), an_import.id)
    elif an_import.import_file[-4:] in [VTT_EXTENTION, SRT_EXTENTION]:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        models = await process_subs(db, an_import)
        logger.debug("%s models found for subs import %s", len(models), an_import.id)
    # elif an_import.import_file.path[-4:] in [CSV_EXTENTION]:
    #     raw = text_from_import(an_import)
    else:
        # synchronous get text from file into memory in chunks for later async parallel processing
        contents = list(chunked(settings.IMPORT_PARSE_CHUNK_SIZE_BYTES, text_from_import(an_import)))

        logger.debug("Found %s chunks to parse for import %s", len(contents), an_import)

        models = await gather_with_concurrency(
            settings.IMPORT_MAX_CONCURRENT_PARSER_QUERIES,
            *[model_from_chunk(manager, chunk, an_import.process_type) for chunk in contents],
        )
    return models


async def get_analysis_from_csv(an_import: Import):
    """
    Extract unique set of words from the first column (currently only supports comma-separated and first column)
    """
    all_words = set()
    async with aiofiles.open(an_import.imported_path()) as csv_file:
        csv_reader = csv.reader((await csv_file.read()).splitlines(), delimiter=",")
        line_count = 0
        for row in csv_reader:
            if len(row) > 0:
                all_words.add(row[0])
            line_count += 1
        logger.info(f"Processed {line_count=} lines with {len(all_words)} unique items")

    return {
        "vocabulary": {
            "buckets": {"1": list(all_words)},
            "counts": {"1": len(all_words)},
        }
    }


async def process_import(file_event: ProcessData):
    async with async_session() as db:
        import_id = file_event.id
        logger.info(f"Starting to import for {import_id}")
        result = await db.execute(
            select(Import)
            .where(Import.id == import_id)
            .options(joinedload(Import.created_by), joinedload(Import.content))
        )
        an_import: Import = result.scalar_one()
        logger.info(f"Starting import {an_import.id}:{an_import.title} for user {an_import.created_by.email}")

        await ensure_cache_preloaded(db, an_import.created_by.from_lang, an_import.created_by.to_lang)

        lang_pair = an_import.created_by.lang_pair

        try:
            if an_import.import_file.endswith(".csv"):
                analysis = await get_analysis_from_csv(an_import)
                an_import.analysis = json.dumps(analysis, ensure_ascii=False, separators=(",", ":"))
            else:
                models = flatten(await models_from_import(db, an_import, lang_pair))
                an_import.analysis = json.dumps(
                    await process(models, an_import.process_type),
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            an_import.processing = FINISHED
        except Exception as ex:  # pylint: disable=W0703
            an_import.processing = ERROR
            logger.exception("Error processing import %s, %s", an_import.id, ex)

        db.add(an_import)
        await db.commit()

        await (await get_broadcast()).publish(channel="imports", message=str(file_event.id))
        logger.info("Finished running import %s", file_event.id)


async def process_list(list_event: ProcessData):
    async with async_session() as db:
        logger.info("Starting list processing %s", list_event.id)

        stmt = (
            select(UserList)
            .where(UserList.id == list_event.id)
            .options(
                joinedload(UserList.created_by, innerjoin=True),
                joinedload(UserList.the_import, innerjoin=True),
            )
        )
        result = await db.execute(stmt)

        a_list: UserList = result.scalar_one()
        manager = managers.get(a_list.created_by.lang_pair)
        if not manager:
            raise NotImplementedError(f"Server does not support language pair {a_list.created_by.lang_pair}")

        await ensure_cache_preloaded(db, a_list.created_by.from_lang, a_list.created_by.to_lang)

        logger.info("Cache loaded, starting actual list processing %s", a_list.id)
        try:
            await a_list.update_list_words(db, manager)
            a_list.processing = FINISHED
        except Exception as ex:  # pylint: disable=W0703
            a_list.processing = ERROR
            logger.exception("Error processing list %s, %s", a_list.id, ex)
            await db.rollback()

        db.add(a_list)
        await db.commit()

        await (await get_broadcast()).publish(channel="userlists", message=str(list_event.id))
        logger.info("Finished running list %s", list_event.id)


async def process_content(content_event: ProcessData):
    async with async_session() as db:
        stmt = (
            select(Content)
            .where(Content.id == content_event.id)
            .options(
                joinedload(Content.created_by, innerjoin=True),
                joinedload(Content.the_import, innerjoin=True),
            )
        )
        result = await db.execute(stmt)
        content: Content = result.scalar_one()
        logger.info("Starting content processing %s", content.id)

        manager = managers.get(content.created_by.lang_pair)
        if not manager:
            raise NotImplementedError(f"Server does not support language pair {content.created_by.lang_pair}")

        await ensure_cache_preloaded(db, content.created_by.from_lang, content.created_by.to_lang)
        logger.info("Cache loaded, starting actual content processing %s", content.id)
        try:
            await enrich_parse(content, manager)
            content.processing = FINISHED
        except Exception as ex:  # pylint: disable=W0703
            content.processing = ERROR
            logger.exception("Error processing content %s, %s", content.id, ex)

        db.add(content)
        await db.commit()

        await (await get_broadcast()).publish(channel="contents", message=str(content_event.id))
        logger.info("Finished running content %s", content.id)
