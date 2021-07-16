from collections import defaultdict
from typing import Tuple

cache_loading = False

TimestampedDict = dict[str, Tuple[float, str, int]]
cached_definitions = defaultdict(TimestampedDict)


class SimpleCache(dict):
    def set(self, key, value):
        self[key] = value


caches: dict[SimpleCache] = {
    "bing_lookup": SimpleCache(),
    "bing_translate": SimpleCache(),
    "bing_transliterate": SimpleCache(),
}
