import * as SQLite from "wa-sqlite";
import { store } from "../../app/createStore";
import { getUserDexie } from "../../database/authdb";
import { setUser } from "../../features/user/userSlice";
import { createSharedServicePort } from "../SharedService";
import { ACTIVE_SQLITE, DatabaseService } from "./DatabaseService";
import { setupWebSockets } from "./sqlsync";
import { initInfo } from "./sqldata";

let databaseService: DatabaseService;

const sqlite3Ready = ACTIVE_SQLITE.esmFactory().then((module) => {
  return SQLite.Factory(module);
});

addEventListener(
  "message",
  (event) => {
    getUserDexie().then((dexieUser) => {
      // FIXME: add a check for the presence of a non-empty db file
      if (!dexieUser?.user?.username || !dexieUser?.user?.accessToken) {
        console.log("no user id, not doing anything");
      } else {
        store.dispatch(setUser(dexieUser));
        databaseService = new DatabaseService(
          sqlite3Ready,
          (progress) => {
            console.log("progressmessage", progress);
            if (progress.isFinished) {
              setupWebSockets(dexieUser).then(() => {
                initInfo().then((value) => {
                  postMessage({
                    source: "SQLITE_WEB_WORKER",
                    type: "loaded",
                    value,
                  });
                });
              });
            }
          },
          ACTIVE_SQLITE.vfs,
        );
        console.log("Setting up shared port service");
        const providerPort = createSharedServicePort(databaseService);
        postMessage({ source: "SQLITE_WEB_WORKER", type: "port_init" }, [providerPort]);
      }
    });
  },
  { once: true },
);
