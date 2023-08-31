import logging
from collections import defaultdict

from app.ndutils import get_from_lang, within_char_limit

logger = logging.getLogger(__name__)

cache_loading = {}

TimeStampedDef = tuple[float, str, int]
TimestampedDict = tuple[float, dict[str, TimeStampedDef]]

cached_definitions = defaultdict(lambda: defaultdict(TimestampedDict))


class SimpleCache(dict):
    def set(self, key, value):
        self[key] = value


caches: dict[SimpleCache] = {
    "bing_lookup": SimpleCache(),
    "bing_translate": SimpleCache(),
    "bing_transliterate": SimpleCache(),
}


class MissingCacheValueException(Exception):
    pass


def add_word_ids(user_words: list, lang_pair: str, allow_missing: bool = False, id_format_fn=str) -> list:
    filtered_words = []
    for x in user_words:
        if not within_char_limit(x[0], get_from_lang(lang_pair)):
            # logger.error("Trying to find an invalid word")
            # logger.error(x)
            continue

        val = (cached_definitions[lang_pair].get(x[0].lower()) or [None, {}])[1].get(x[0])
        if not val:
            if not allow_missing:
                logger.error(x)
                raise MissingCacheValueException(
                    f"Unable to find entry in cache for {x[0]}, this should not be possible..."
                )
            else:
                x.append(None)
        else:
            x.append(id_format_fn(val[2]))

        filtered_words.append(x)

    # for uw in filtered_words:
    #     val = (cached_definitions[lang_pair].get(uw[0].lower()) or [None, {}])[1].get(uw[0])
    #     if not val:
    #         if not allow_missing:
    #             logger.error(uw)
    #             raise MissingCacheValueException(
    #                 f"Unable to find entry in cache for {uw[0]}, this should not be possible..."
    #             )
    #         # FIXME: why did I have this again???
    #         # else:
    #         #     uw.append(None)
    #     else:
    #         uw.append(id_format_fn(val[2]))
    return filtered_words
