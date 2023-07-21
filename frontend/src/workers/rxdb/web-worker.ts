/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { store } from "../../app/createStore";
import { getUserDexie } from "../../database/authdb";
import { setUser } from "../../features/user/userSlice";
import { DatabaseService } from "./DatabaseService";
import { createSharedServicePort } from "../SharedService";
import {
  ACTIVITY_QUEUE_PROCESS_FREQ,
  EVENT_QUEUE_PROCESS_FREQ,
  PUSH_FILES_PROCESS_FREQ,
  REQUEST_QUEUE_PROCESS_FREQ,
} from "../../lib/types";
import { NAME_PREFIX } from "../../lib/interval/interval-decorator";
import { processRequestQueue, pushFiles, sendActivities, sendUserEvents } from "./rxdata";

console.log("Rxdb webworker module root log");

addEventListener(
  "message",
  (event) => {
    getUserDexie().then((dexieUser) => {
      if (!dexieUser?.user?.username || !dexieUser?.user?.accessToken) {
        console.log("no user id, not doing anything for rxdb");
      } else {
        store.dispatch(setUser(dexieUser));
        const databaseService = new DatabaseService(
          (progress) => {
            console.log("progressmessage", progress);
            if (progress.isFinished) {
              postMessage({
                source: "RXDB_WEB_WORKER",
                type: "loaded",
              });
              console.log("Setting up interval services");
              setInterval(
                () => sendUserEvents(new URL(dexieUser.baseUrl)),
                EVENT_QUEUE_PROCESS_FREQ,
                NAME_PREFIX + "sendUserEvents",
              );
              setInterval(
                () => processRequestQueue(new URL(dexieUser.baseUrl)),
                REQUEST_QUEUE_PROCESS_FREQ,
                NAME_PREFIX + "processRequestQueue",
              );
              // setInterval(
              //   () => sendActivities(new URL(dexieUser.baseUrl)),
              //   ACTIVITY_QUEUE_PROCESS_FREQ,
              //   NAME_PREFIX + "sendActivity",
              // );

              // This could theoretically be done anywhere but it's not a bad place to do it...
              setInterval(
                () => pushFiles(new URL(dexieUser.baseUrl)),
                PUSH_FILES_PROCESS_FREQ,
                NAME_PREFIX + "pushFiles",
              );
            }
          },
          (cacheName) =>
            postMessage({
              source: "RXDB_WEB_WORKER",
              type: "decache",
              value: cacheName,
            }),
          undefined,
        );
        console.log("Setting up shared port service for rxdb");
        const providerPort = createSharedServicePort(databaseService);
        postMessage({ source: "RXDB_WEB_WORKER", type: "port_init" }, [providerPort]);
      }
    });
  },
  { once: true },
);
