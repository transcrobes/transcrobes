export const WEBPUB_CACHE_NAME = "webpub-cache";
export const AGE_HEADER = "sw-fetched-on";
export const PRECACHE_PUBLICATIONS = "PRECACHE_PUBLICATIONS";
// one week worth of seconds
export const CACHE_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;

export const ReadiumWebpubContext = "http://readium.org/webpub/default.jsonld";
export const IS_DEV = process.env.NODE_ENV === "development";
