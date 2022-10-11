from collections import defaultdict

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
