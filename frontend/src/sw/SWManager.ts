import dayjs from "dayjs";
import { ExpirationPlugin } from "workbox-expiration";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { store } from "../app/createStore";
import { getUserDexie } from "../database/authdb";
import { getDb, unloadDatabaseFromMemory } from "../database/Database";
import { TranscrobesDatabase } from "../database/Schema";
import { setUser } from "../features/user/userSlice";
import * as data from "../lib/data";
import { intervalCollection, NAME_PREFIX } from "../lib/interval/interval-decorator";
import { fetchPlus } from "../lib/libMethods";
import {
  ACTIVITY_QUEUE_PROCESS_FREQ,
  DEFAULT_RETRIES,
  EventData,
  EVENT_QUEUE_PROCESS_FREQ,
  IS_DEV,
  ONE_YEAR_IN_SECS,
  PublicationConfig,
  PUSH_FILES_PROCESS_FREQ,
  REQUEST_QUEUE_PROCESS_FREQ,
  UserDefinitionType,
  WEBPUB_CACHE_NAME,
  PolyglotMessage,
} from "../lib/types";
import { ReadiumLink } from "../lib/WebpubManifestTypes/ReadiumLink";
import { WebpubManifest } from "../lib/WebpubManifestTypes/WebpubManifest";

const VERSION = "v2";

const dictionaries: Record<string, Record<string, UserDefinitionType>> = {};
let db: TranscrobesDatabase | null;
let url: URL;

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

  const user = await getUserDexie();
  console.debug("DB NOT loaded, (re)loading with items", user.username, user.baseUrl);
  if (!user) {
    console.error("No user found in db, cannot load");
    throw new Error("No user found in db, cannot load");
  }
  store.dispatch(setUser(user));
  intervalCollection.removeAll();

  const progressCallback = (progressMessage: PolyglotMessage, isFinished: boolean) => {
    const progress = { message: progressMessage, isFinished };
    if (event) {
      postIt(event, {
        source: message.source,
        type: message.type + "-progress",
        value: progress,
      });
    }
  };
  return getDb({ url, username: user.username }, progressCallback, sw).then((dbObj) => {
    db = dbObj;
    sw.tcb = Promise.resolve(dbObj);
    // FIXME: !!! these should NOT be intervals but rather timeouts that relaunch
    // when they have finished. Running multiple intervals is a waste of resources and
    // can cause problems with the database
    setInterval(() => data.sendUserEvents(dbObj, url), EVENT_QUEUE_PROCESS_FREQ, NAME_PREFIX + "sendUserEvents");
    setInterval(
      () => data.processRequestQueue(dbObj, url),
      REQUEST_QUEUE_PROCESS_FREQ,
      NAME_PREFIX + "processRequestQueue",
    );
    setInterval(() => data.pushFiles(url, user.username), PUSH_FILES_PROCESS_FREQ, NAME_PREFIX + "pushFiles");
    setInterval(() => data.sendActivities(dbObj, url), ACTIVITY_QUEUE_PROCESS_FREQ, NAME_PREFIX + "sendActivity");
    if (event) {
      postIt(event, { source: message.source, type: message.type, value: "loadDb success" });
    }
    return Promise.resolve([db, message]);
  });
}

async function getLocalCardWords(message: EventData, sw: ServiceWorkerGlobalScope) {
  if (!sw.dayCardWords) {
    const [ldb] = await loadDb(message, sw);
    const val = await data.getSerialisableCardWords(ldb);
    sw.dayCardWords = val;
  }
  return sw.dayCardWords;
}

async function getUserDictionary(ldb: TranscrobesDatabase, dictionaryId: string) {
  if (!dictionaries[dictionaryId]) {
    dictionaries[dictionaryId] = await data.getDictionaryEntries(ldb, { dictionaryId });
  }
  return dictionaries[dictionaryId];
}

export async function resetDBConnections(sw: ServiceWorkerGlobalScope): Promise<void> {
  db = null;
  sw.dayCardWords = null;
  intervalCollection.removeAll();
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
function extractHrefs(links: ReadiumLink[], manifestUrl: string, proxyUrl: string | undefined): string[] {
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

/**
 * Register the additional urls we sent with a stale-while-revalidate strategy
 * Cache all the manifests in parallel. They're top priority.
 * Then cache all their resources.
 * Only cache items that don't already exist in the cache.
 */
export async function cachePublications(publications: PublicationConfig[]): Promise<PromiseSettledResult<void>[]> {
  const cache = await caches.open(WEBPUB_CACHE_NAME);

  // first route the swr urls
  for (const pub of publications) {
    for (const url of pub.swrUrls ?? []) {
      console.debug(`Routing ${url}`);
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
  const pubs = pubResults.map((result) => (result.status === "fulfilled" ? result.value : undefined)).filter(isPub);

  // then route, fetch and cache all resources in each.
  const promises = pubs.map(async (pub) => {
    // make a list of resources with proxy included
    const resourceHrefs = extractHrefs(pub.manifest.resources ?? [], pub.manifestUrl, pub.proxyUrl);

    const readingOrderHrefs = extractHrefs(pub.manifest.readingOrder ?? [], pub.manifestUrl, pub.proxyUrl);

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
    case "getSerialisableCardWords":
      getLocalCardWords(message, sw).then((dayCW) => {
        postIt(event, {
          source: message.source,
          type: message.type,
          value: dayCW,
        });
      });
      break;

    case "sentenceTranslation":
      loadDb(message, sw).then(() => {
        fetchPlus(
          "api/v1/enrich/translate", // FIXME: hardcoded nastiness
          JSON.stringify({ data: message.value }),
          DEFAULT_RETRIES,
        ).then((translation) => {
          postIt(event, { source: message.source, type: message.type, value: translation });
        });
      });
      break;
    case "enrichHtmlText":
      fetchPlus("api/v1/enrich/enrich_html_to_json", JSON.stringify({ data: message.value }), DEFAULT_RETRIES).then(
        (parse) => {
          postIt(event, {
            source: message.source,
            type: message.type,
            value: parse,
          });
        },
      );
      break;
    case "getDictionaryEntries":
      loadDb(message, sw).then(([ldb, msg]) => {
        getUserDictionary(ldb, msg.value.dictionaryId).then((entries) => {
          postIt(event, { source: msg.source, type: msg.type, value: entries });
        });
      });
      break;
    case "getDictionaryEntriesByGraph":
      loadDb(message, sw).then(([ldb, msg]) => {
        const outputEntries: Record<string, UserDefinitionType> = {};
        getUserDictionary(ldb, msg.value.dictionaryId).then((entries) => {
          for (const graph of msg.value.graphs) {
            outputEntries[graph] = entries[graph];
          }
          postIt(event, { source: msg.source, type: msg.type, value: outputEntries });
        });
      });
      break;
    case "saveDictionaryEntries":
      delete dictionaries[message.value.dictionaryId];
      loadDb(message, sw).then(([ldb, msg]) => {
        data.saveDictionaryEntries(ldb, message.value).then((result) => {
          postIt(event, { source: msg.source, type: msg.type, value: result });
        });
      });
      break;
    case "getWordDetails":
      loadDb(message, sw).then(([ldb, msg]) => {
        Promise.all(message.value.dictionaryIds.map(async (d: string) => [d, await getUserDictionary(ldb, d)])).then(
          (dictionaries: [string, Record<string, UserDefinitionType>][]) => {
            data.getWordDetails(ldb, message.value.graph).then((result) => {
              for (const [dictionaryId, dictionary] of dictionaries) {
                const entry = dictionary[message.value.graph];
                if (entry) {
                  result.word?.providerTranslations.push({
                    provider: dictionaryId,
                    posTranslations: entry.translations,
                  });
                }
              }
              postIt(event, { source: msg.source, type: msg.type, value: result });
            });
          },
        );
      });
      break;
    case "getContentStatsForImport":
    case "getContentAccuracyStatsForImport":
    case "getImportUtilityStatsForList":
      loadDb(message, sw).then(([ldb, msg]) => {
        getLocalCardWords(message, sw).then((dayCW) => {
          data[message.type](ldb, msg.value, dayCW).then((result) => {
            postIt(event, { source: msg.source, type: msg.type, value: result });
          });
        });
      });
      break;
    // The following devalidate the dayCardWords "cache", so setting to null
    case "practiceCardsForWord":
    case "addOrUpdateCardsForWord":
    case "updateCard":
    // @ts-ignore - actually here we DO want to use the default case
    case "createCards":
      sw.dayCardWords = null; // simpler to set to null rather than try and merge lots
    // eslint-disable-next-line no-fallthrough
    case "addRecentSentences":
    case "createRegistrationRequest":
    case "practiceCard":
    case "saveSurvey":
    case "setContentConfigToStore":
    case "submitLookupEvents":
    case "submitContentEnrichRequest":
    case "submitUserEvents":
    case "updateRecentSentences":
    case "getCharacterDetails":
    case "getAllFromDB":
    case "getByIds":
    case "getWordsByGraphs":
    case "getWordFromDBs":
    case "getKnownWordIds":
    case "getContentConfigFromStore":
    case "getUserListWords":
    case "getDefaultWordLists":
    case "getWordListWordIds":
    case "getVocabReviews":
    case "getSRSReviews":
    case "getRecentSentences":
    case "getFirstSuccessStatsForList":
    case "getFirstSuccessStatsForImport":
    case "getWaitingRevisions":
    case "getDayStats":
    case "getWordStatsForExport":
    case "getAllShortWords":
    case "getAllShortChars":
    case "getCardsForExport":
    case "getAllUserDictionaryEntries":
    case "enqueueRegistrations":
    case "submitActivityEvent":
    case "getLanguageClassParticipants":
    case "forceDefinitionsInitialSync":
    case "purgeInvalidRecentSentences":
    case "refreshSession":
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
