/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import * as Comlink from "comlink";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { CacheFirst } from "workbox-strategies";
import { IS_DEV, ONE_YEAR_IN_SECS, WEBPUB_CACHE_NAME } from "../lib/types";
import { serviceWorkerDataManager } from "./swdata";
import { getUserDexie } from "../database/authdb";
import { setUser } from "../features/user/userSlice";
import { store } from "../app/createStore";

/**
 * We claim the clients immediately and skip waiting because we don't care if
 * half the page resources come from the SW and half from the network. We use
 * content hashes for this to work
 */
clientsClaim();

declare const self: ServiceWorkerGlobalScope;
self.__WB_DISABLE_DEV_LOGS = true;
console.debug("INITIALIZING");
self.addEventListener("install", (event) => {
  console.debug("INSTALLING");
  async function installSW() {
    // perform any install tasks
    // skip the waiting phase and activate immediately
    await self.skipWaiting();
  }
  event.waitUntil(installSW());
});

// Precache all of the assets generated by your build process.
if (!IS_DEV) {
  const manifest = self.__WB_MANIFEST as { revision: string; url: string }[];
  console.log("precache and route", manifest);
  // precacheAndRoute(manifest.map(({ revision, url }) => ({ revision, url: `https://tc.tck/${url}` })));
  precacheAndRoute(manifest);
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
  if (event.request.url === globalThis.registration.scope + "clientId") {
    return event.respondWith(
      new Response(event.clientId, {
        headers: { "Content-Type": "text/plain" },
      }),
    );
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

self.addEventListener("activate", (event) => {
  event.waitUntil(globalThis.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data.comlinkInit) {
    getUserDexie().then((userData) => {
      store.dispatch(setUser(userData));
      Comlink.expose(serviceWorkerDataManager, event.data.port);
    });
  } else if (event.data?.sharedService) {
    globalThis.clients.get(event.data.clientId).then((client) => {
      client?.postMessage(event.data, event.ports);
    });
    return;
  }
});
