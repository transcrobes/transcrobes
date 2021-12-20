/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

import { DataProvider } from "ra-core";
import { DataProviderResult } from "react-admin";
import { TranscrobesDatabase } from "./database/Schema";
import { ONE_YEAR_IN_SECS } from "./lib/types";

import RxDBProvider from "./ra-data-rxdb";
import initWebReaderSW from "./sw";
import { manageEvent, resetDBConnections } from "./SWManager";

declare const self: ServiceWorkerGlobalScope;
declare global {
  interface ServiceWorkerGlobalScope {
    tcb: Promise<TranscrobesDatabase> | null;
  }
}
let dataProvider: DataProvider | null;

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
  } else if (event.data && event.data.type === "DataProvider") {
    // this is the code for managing the react-admin queries, see rx-data-sw
    if (!dataProvider) {
      const url = new URL(self.location.href);
      dataProvider = RxDBProvider({ url: url });

      self.tcb = dataProvider.db();
    }
    dataProvider[event.data.method](event.data.collection, event.data.params).then(
      (res: DataProviderResult) => {
        event.ports[0].postMessage(res);
      },
    );
  } else if (event.data && event.data.type) {
    manageEvent(self, event);
  }
});

initWebReaderSW({ cacheExpirationSeconds: ONE_YEAR_IN_SECS });
