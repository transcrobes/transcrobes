import { ExpirationPlugin } from "workbox-expiration";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ServiceWorkerManager } from "../data/types";
import { ReadiumLink } from "../lib/WebpubManifestTypes/ReadiumLink";
import { WebpubManifest } from "../lib/WebpubManifestTypes/WebpubManifest";
import { fetchPlus } from "../lib/libMethods";
import { DEFAULT_RETRIES, ONE_YEAR_IN_SECS, PublicationConfig, WEBPUB_CACHE_NAME } from "../lib/types";

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
async function cachePublications(publications: PublicationConfig[]): Promise<PromiseSettledResult<void>[]> {
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

async function precachePublications(publications: PublicationConfig[]) {
  console.debug("Precaching publications");
  if (typeof publications !== "object") {
    console.error("Precache event missing publications");
    return;
  }
  await cachePublications(publications);
  console.debug("Finished caching publications", publications);
}

async function sentenceTranslation(text: string) {
  // this doesn't actually need to be done here but the shared code needs to be able to go through
  // the proxy, as when executed through the chrome extension it will be on a different domain
  return await fetchPlus("api/v1/enrich/translate", JSON.stringify({ data: text }), DEFAULT_RETRIES);
}

export const serviceWorkerDataManager: ServiceWorkerManager = {
  precachePublications,
  sentenceTranslation,
};

export type ServiceWorkerManagerMethods = keyof typeof serviceWorkerDataManager;
export const serviceWorkerDataManagerKeys = Object.keys(serviceWorkerDataManager) as ServiceWorkerManagerMethods[];
