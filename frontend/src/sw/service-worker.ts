/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { DataProvider } from "ra-core";
import { DataProviderResult } from "react-admin";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { CacheFirst } from "workbox-strategies";
import { getUserDexie } from "../database/authdb";
import { TranscrobesDatabase } from "../database/Schema";
import { IS_DEV, ONE_YEAR_IN_SECS, PRECACHE_PUBLICATIONS, WEBPUB_CACHE_NAME } from "../lib/types";
import RxDBProvider from "../ra-data-rxdb";
import { cachePublications, log, manageEvent, resetDBConnections } from "./SWManager";

/**
 * We claim the clients immediately and skip waiting because we don't care if
 * half the page resources come from the SW and half from the network. We use
 * content hashes for this to work
 */
clientsClaim();

declare const self: ServiceWorkerGlobalScope;
declare global {
  interface ServiceWorkerGlobalScope {
    tcb: Promise<TranscrobesDatabase> | null;
    needsReload: boolean;
    needsSWReload: boolean; // FIXME: unused
  }
}
let dataProvider: DataProvider | null;

log("INITIALIZING");
self.addEventListener("install", (event) => {
  log("INSTALLING ");
  async function installSW() {
    // perform any install tasks
    // skip the waiting phase and activate immediately
    await self.skipWaiting();
    log("INSTALLED");
    self.needsReload = true;
  }
  event.waitUntil(installSW());
});

// Precache all of the assets generated by your build process.
if (!IS_DEV) {
  precacheAndRoute(self.__WB_MANIFEST);
}
/**
 * On a fetch event, respond with an item from the cache, if
 * it exists. We don't ever add things to the cache here,
 * because the fetch event is called for _all_ network requests,
 * and we can't tell if any given request is for app resources or
 * publication resources. Thus publication resources are added
 * to the cache separately, and then just returned if found here.
 *
 * This event listener MUST be run as the last fetch event listener
 * of all in the host app because it always responds to the event
 * in order to be able to use async functionality.
 */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  // Only get stuff we know is content related, otherwise it is managed elsewhere
  if (!event.request.url.match(/\/api\/v1\/data\/content\/.*/)) {
    return;
  }
  async function matchOrFetch() {
    const pubCache = await caches.open(WEBPUB_CACHE_NAME);
    const match = await pubCache.match(event.request);

    // check if there is a match
    if (match) {
      return new CacheFirst({
        cacheName: WEBPUB_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: ONE_YEAR_IN_SECS,
          }),
        ],
      }).handle(event);
    }
    // otherwise go to network
    return fetch(event.request);
  }
  // we have to make the event wait if we want to use async work. This will
  // make the network tab show "ServiceWorker" in all requests, despite the
  // fact that not every request actually goes through the service worker:
  // https://stackoverflow.com/questions/33590378/status-code200-ok-from-serviceworker-in-chrome-network-devtools/33655173
  event.respondWith(matchOrFetch());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "resetDBConnections") {
    console.log("reset db connections");
    dataProvider = null;
    self.tcb = null;
    resetDBConnections().then(() => {
      console.log("Database unloaded");
      event.ports[0].postMessage("Database unloaded");
    });
  } else if (event.data && event.data.type === "NEEDS_RELOAD") {
    event.ports[0].postMessage({
      source: event.data.source,
      type: event.data.type,
      value: self.needsReload,
    });
    self.needsReload = false;
  } else if (event.data && event.data.type === "DataProvider") {
    // this is the code for managing the react-admin queries, see rx-data-sw
    if (!dataProvider) {
      const url = new URL(self.location.href);
      getUserDexie().then(({ username, user }) => {
        dataProvider = RxDBProvider({ url: url, username, messagesLang: user.toLang });
        self.tcb = dataProvider.db();
        dataProvider[event.data.method](event.data.collection, event.data.params).then((res: DataProviderResult) => {
          event.ports[0].postMessage(res);
        });
      });
    } else {
      dataProvider[event.data.method](event.data.collection, event.data.params).then((res: DataProviderResult) => {
        event.ports[0].postMessage(res);
      });
    }
  } else if (event.data.type === PRECACHE_PUBLICATIONS) {
    // This code largely inspired/stolen from @nypl/web-reader
    log("Precaching publications");
    if (typeof event.data.publications !== "object") {
      console.error("Precache event missing publications");
      return;
    }
    cachePublications(event.data.publications).then(() => {
      log("Finished caching publications", event.data.publications);
    });
  } else if (event.data && event.data.type) {
    manageEvent(self, event);
  }
});
