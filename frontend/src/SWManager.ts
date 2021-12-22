import { RxDatabase } from "rxdb/dist/types/core";
import dayjs from "dayjs";

import { getDb, unloadDatabaseFromMemory } from "./database/Database";
import {
  setAccessToken,
  setRefreshToken,
  setUsername,
  EVENT_QUEUE_PROCESS_FREQ,
  PUSH_FILES_PROCESS_FREQ,
  fetchPlus,
  baseUrl,
  DEFAULT_RETRIES,
} from "./lib/lib";
import * as data from "./lib/data";
import { DayCardWords, EventData, IS_DEV } from "./lib/types";
import { getAccess, getRefresh, getUsername } from "./lib/JWTAuthProvider";
import { TranscrobesCollections, TranscrobesDatabase } from "./database/Schema";

import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { WebpubManifest } from "@nypl/web-reader/dist/esm/WebpubManifestTypes/WebpubManifest";
import { ReadiumLink } from "@nypl/web-reader/dist/esm/WebpubManifestTypes/ReadiumLink";
import { PublicationConfig } from "@nypl/web-reader/dist/esm/ServiceWorker/types";
import { ONE_YEAR_IN_SECS, WEBPUB_CACHE_NAME } from "./lib/types";
import { registerRoute } from "workbox-routing";
import { ExpirationPlugin } from "workbox-expiration";

const VERSION = "v2";

// FIXME: move to redux!!! or something less nasty!!!
let dayCardWords: DayCardWords | null;

let db: RxDatabase<TranscrobesCollections> | null;

let url: URL;
// FIXME: find some way to be able to stop the timer if required/desired
let eventQueueTimer: null | ReturnType<typeof setTimeout> = null;
let pushFileTimer: null | ReturnType<typeof setTimeout> = null;

export function postIt(event: ExtendableMessageEvent, newMessage: EventData): void {
  if (event.ports && event.ports[0]) {
    // This should be the workbox.messageSW, maybe
    event.ports[0].postMessage(newMessage);
  } else if (event.source) {
    // This should be the proxy, maybe
    event.source.postMessage(newMessage, []);
  } else {
    console.warn("Unable to find a channel to reply to", event, newMessage);
  }
}

async function loadDb(
  message: EventData,
  sw: ServiceWorkerGlobalScope,
  event?: ExtendableMessageEvent,
): Promise<[TranscrobesDatabase, EventData]> {
  if (db) {
    if (event) {
      postIt(event, { source: message.source, type: message.type, value: "loadDb success" });
    }
    return Promise.resolve([db, message]);
  }
  console.debug("Setting up the db in the service worker");

  if (eventQueueTimer) {
    clearInterval(eventQueueTimer);
  }
  if (pushFileTimer) {
    clearInterval(pushFileTimer);
  }

  setAccessToken(
    (await getAccess()) ||
      (() => {
        throw new Error("Unable to get access credentials");
      })(),
  );
  setRefreshToken(
    (await getRefresh()) ||
      (() => {
        throw new Error("Unable to get refresh credentials");
      })(),
  );
  setUsername(
    (await getUsername()) ||
      (() => {
        throw new Error("Unable to get username");
      })(),
  );

  const progressCallback = (progressMessage: string, isFinished: boolean) => {
    const progress = { message: progressMessage, isFinished };
    if (event) {
      postIt(event, {
        source: message.source,
        type: message.type + "-progress",
        value: progress,
      });
    }
  };
  return getDb({ url: url }, progressCallback).then((dbObj) => {
    db = dbObj;
    if (!sw.tcb) sw.tcb = new Promise<TranscrobesDatabase>((resolve, _reject) => resolve(dbObj));
    if (!eventQueueTimer && db) {
      eventQueueTimer = setInterval(
        () => data.sendUserEvents(dbObj, url),
        EVENT_QUEUE_PROCESS_FREQ,
      );
    }
    if (!pushFileTimer) {
      pushFileTimer = setInterval(() => data.pushFiles(url), PUSH_FILES_PROCESS_FREQ);
    }
    if (event) {
      postIt(event, { source: message.source, type: message.type, value: "loadDb success" });
    }
    return Promise.resolve([db, message]);
  });
}

function getLocalCardWords(message: EventData, sw: ServiceWorkerGlobalScope) {
  if (dayCardWords) {
    return Promise.resolve(dayCardWords);
  } else {
    return loadDb(message, sw).then(([ldb, _msg]) => {
      return data.getCardWords(ldb).then((val) => {
        dayCardWords = val;
        return Promise.resolve(dayCardWords);
      });
    });
  }
}

export async function resetDBConnections(): Promise<void> {
  db = null;
  dayCardWords = null;
  if (eventQueueTimer) {
    clearInterval(eventQueueTimer);
  }
  if (pushFileTimer) {
    clearInterval(pushFileTimer);
  }
  await unloadDatabaseFromMemory();
}
/**
 * Prepends the proxy url if there is one
 */
function getProxiedUrl(url: string, proxyUrl: string | undefined) {
  return proxyUrl ? `${proxyUrl}${encodeURIComponent(url)}` : url;
}

/**
 * If the passed in url is relative, it will resolve it relative to the
 * manifest url. Otherwise it should stay the same. Finally, the proxy is
 * conditionally added
 */
function getAbsoluteUrl(maybeRelative: string, manifestUrl: string, proxyUrl?: string) {
  return getProxiedUrl(new URL(maybeRelative, manifestUrl).toString(), proxyUrl);
}

/**
 * Gets an array of raw href values from an array of readium links
 */
function extractHrefs(
  links: ReadiumLink[],
  manifestUrl: string,
  proxyUrl: string | undefined,
): string[] {
  return links.map((res) => getAbsoluteUrl(res.href, manifestUrl, proxyUrl));
}

type PubWithManifest = PublicationConfig & { manifest: WebpubManifest };

function isPub(maybe: PubWithManifest | undefined): maybe is PubWithManifest {
  return !!maybe;
}

function handleBadResponse(url: string, response: Response) {
  if (!response.ok) {
    const message = `Bad response status for: ${url}. Status: ${response.status}`;
    console.warn(message);
    throw new Error(message);
  }
}

// each logging line will be prepended with the service worker version
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function log(message: string, ...rest: any): void {
  if (IS_DEV) console.log(`SW (${VERSION}) -`, message, ...rest);
}

/**
 * Register the additional urls we sent with a stale-while-revalidate strategy
 * Cache all the manifests in parallel. They're top priority.
 * Then cache all their resources.
 * Only cache items that don't already exist in the cache.
 */
export async function cachePublications(
  publications: PublicationConfig[],
): Promise<PromiseSettledResult<void>[]> {
  const cache = await caches.open(WEBPUB_CACHE_NAME);

  // first route the swr urls
  for (const pub of publications) {
    for (const url of pub.swrUrls ?? []) {
      log(`Routing ${url}`);
      registerRoute(url, new StaleWhileRevalidate({ cacheName: WEBPUB_CACHE_NAME }));
    }
  }
  const cacheFirst = new CacheFirst({
    cacheName: WEBPUB_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: ONE_YEAR_IN_SECS,
      }),
    ],
  });

  // route, fetch and cache the manifests.
  // but don't re-fetch if they already exist in cache.
  const pubResults: PromiseSettledResult<PubWithManifest>[] = await Promise.allSettled(
    publications.map(async (pub) => {
      const finalManifestUrl = getProxiedUrl(pub.manifestUrl, pub.proxyUrl);

      // route it so that workbox knows to respond.
      registerRoute(finalManifestUrl, cacheFirst);

      // bail out if the manifest already exists
      const match = await cache.match(finalManifestUrl);
      if (match) {
        return { ...pub, manifest: await match.json() };
      }

      // otherwise fetch it
      const manifestResponse = await fetch(finalManifestUrl);
      handleBadResponse(finalManifestUrl, manifestResponse);

      // add the manifest response to the cache
      await cache.put(finalManifestUrl, manifestResponse.clone());
      const manifest: WebpubManifest = await manifestResponse.json();
      return { ...pub, manifest };
    }),
  );

  // filter out any errored results
  const pubs = pubResults
    .map((result) => (result.status === "fulfilled" ? result.value : undefined))
    .filter(isPub);

  // then route, fetch and cache all resources in each.
  const promises = pubs.map(async (pub) => {
    // make a list of resources with proxy included
    const resourceHrefs = extractHrefs(pub.manifest.resources ?? [], pub.manifestUrl, pub.proxyUrl);

    const readingOrderHrefs = extractHrefs(
      pub.manifest.readingOrder ?? [],
      pub.manifestUrl,
      pub.proxyUrl,
    );

    // make sure array is deduped using set or we may get a cache error
    const allResourcesToCache = Array.from(new Set([...resourceHrefs, ...readingOrderHrefs]));

    // route, fetch and cache each one.
    // but don't re-fetch if it is already in the cache.
    await Promise.all(
      allResourcesToCache.map(async (url) => {
        // route it
        registerRoute(url, cacheFirst);
        // bail out if it already exists
        const match = await cache.match(url);
        if (match) {
          return;
        }
        const response = await fetch(url);
        handleBadResponse(url, response);
        return await cache.put(url, response);
      }),
    );
  });

  return await Promise.allSettled(promises);
}

export function manageEvent(sw: ServiceWorkerGlobalScope, event: ExtendableMessageEvent): void {
  if (!url) {
    url = new URL(sw.location.href);
  }

  if (!event.data || !event.data.type) {
    console.debug("Received an event without a message", event);
    return;
  }
  const message = event.data as EventData;

  switch (message.type) {
    case "syncDB":
      loadDb(message, sw, event);
      break;
    case "heartbeat":
      postIt(event, { source: message.source, type: message.type, value: dayjs().format() });
      break;
    case "getCardWords":
      getLocalCardWords(message, sw).then((dayCW) => {
        postIt(event, {
          source: message.source,
          type: message.type,
          // convert to arrays or Set()s get silently purged in chrome extensions, so
          // need to mirror here for the same return types... Because JS is sooooooo awesome!
          // value: [Array.from(values[0]), Array.from(values[1]), values[2]]
          value: {
            allCardWordGraphs: Array.from(dayCW.allCardWordGraphs),
            knownCardWordGraphs: Array.from(dayCW.knownCardWordGraphs),
            knownWordIdsCounter: dayCW.knownWordIdsCounter,
          },
        });
      });
      break;
    case "sentenceTranslation":
      loadDb(message, sw).then(() => {
        fetchPlus(
          baseUrl + "api/v1/enrich/translate", // FIXME: hardcoded nastiness
          JSON.stringify({ data: message.value }),
          DEFAULT_RETRIES,
        ).then((translation) => {
          postIt(event, { source: message.source, type: message.type, value: translation });
        });
      });
      break;
    // The following devalidate the dayCardWords "cache", so setting to null
    case "practiceCardsForWord":
    case "addOrUpdateCardsForWord":
    case "updateCard":
    case "createCards":
      dayCardWords = null; // simpler to set to null rather than try and merge lots
    // eslint-disable-next-line no-fallthrough
    case "getCharacterDetails":
    case "getAllFromDB":
    case "getByIds":
    case "getWordDetails":
    case "practiceCard":
    case "getWordFromDBs":
    case "getKnownWordIds":
    case "saveSurvey":
    case "submitLookupEvents":
    case "getUserListWords":
    case "getDefaultWordLists":
    case "getWordListWordIds":
    case "setContentConfigToStore":
    case "getContentConfigFromStore":
    case "getVocabReviews":
    case "getSRSReviews":
    case "submitUserEvents":
    case "updateRecentSentences":
    case "addRecentSentences":
    case "getRecentSentences":
    case "getFirstSuccessStatsForList":
    case "getFirstSuccessStatsForImport":
    case "submitContentEnrichRequest":
      loadDb(message, sw).then(([ldb, msg]) => {
        // @ts-ignore FIXME: can I properly type this somehow and it actually be clean/useful?
        data[message.type](ldb, message.value).then((result) => {
          postIt(event, { source: msg.source, type: msg.type, value: result });
        });
      });
      break;

    default:
      console.warn("Service Worker received a message event that I had no manager for", event);
      break;
  }
}
