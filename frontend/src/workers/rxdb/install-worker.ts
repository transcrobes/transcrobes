/// <reference lib="webworker" />

import { store } from "../../app/createStore";
import { setUser } from "../../features/user/userSlice";
import { type UserState } from "../../lib/types";
import { progressCallback } from "../common-worker";
import { getDb, unloadDatabaseFromMemory } from "./Database";

export const DATA_SOURCE = "RXDB_INSTALL_WORKER";

addEventListener(
  "message",
  (event) => {
    if (Object.hasOwn(event.data, "vscodeScheduleAsyncWork")) {
      // rubbish from the monaco editor...
      return;
    }
    console.log("Got a rxdb install worker message with an event", event);
    if (event.data.type === "install") {
      (async () => {
        const dexieUser = event.data.value as UserState;
        if (!dexieUser?.user?.username || !dexieUser?.user?.accessToken) {
          console.error("Got an uninitialised dexieUser");
          postMessage({
            source: DATA_SOURCE,
            type: "error",
            value: { isFinished: false, message: { phrase: "database.install_error" } },
          });
          throw new Error("Got an uninitialised dexieUser");
        }
        const username = dexieUser.user.username;
        store.dispatch(setUser(dexieUser));

        progressCallback({ source: DATA_SOURCE, isFinished: false, message: { phrase: "database.installing" } });
        await getDb({ url: new URL(origin), username }, progressCallback, () => {}, true);
        console.log("Rxdb install worker should be finished creating and syncing");
        await unloadDatabaseFromMemory();
        postMessage({
          source: DATA_SOURCE,
          type: "finished",
          value: { isFinished: true, message: { phrase: "database.rxinstalled" } },
        });
      })();
    } else {
      console.debug("Got an invalid message to rxdb install worker", event);
    }
  },
  { once: true },
);
