/// <reference lib="webworker" />

import { store } from "../../app/createStore";
import { setUser } from "../../features/user/userSlice";
import { fetchPlus } from "../../lib/libMethods";
import { TCDB_FILENAME, type UserState } from "../../lib/types";
import { asyncPoolAll } from "../common-db";
import { progressCallback } from "../common-worker";
import { AccessHandlePoolVFS } from "./AccessHandlePoolVFS";
import * as VFS from "./sqlite-constants.js";

export const DATA_SOURCE = "SQLITE_INSTALL_WORKER";

const BLOCK_SIZE = 10_485_760;
const FILE_ID = 0xdeadbeef;

async function installDbFromParts(userData: UserState) {
  const data = await fetchPlus(new URL("/api/v1/enrich/dbexports.json", userData.baseUrl), undefined, 3, false, "json");
  const vfs = new AccessHandlePoolVFS(`/${TCDB_FILENAME}`);
  await vfs.isReady;
  const filename = TCDB_FILENAME;
  vfs.xOpen(
    filename,
    FILE_ID,
    VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE | VFS.SQLITE_OPEN_MAIN_DB,
    new DataView(new ArrayBuffer(8)),
  );
  const entryBlock = async (partName: string) => {
    progressCallback({
      source: DATA_SOURCE,
      isFinished: false,
      message: { phrase: "database.datafile", options: { datafile: partName } },
    });

    const partNo = parseInt(partName.replace("tc.db.", "").replace(".part", ""));
    return vfs.xWrite(
      FILE_ID,
      // @ts-ignore
      new DataView(
        await fetchPlus(
          new URL(`/api/v1/enrich/dbexports/${partName}`, userData.baseUrl),
          undefined,
          3,
          false,
          "arrayBuffer",
        ),
      ),
      partNo * BLOCK_SIZE,
    );
  };
  try {
    await asyncPoolAll(2, data, entryBlock);
    vfs.xSync(FILE_ID, null);
    vfs.xClose(FILE_ID);
    await vfs.close();
    await fetchPlus(new URL("/api/v1/enrich/decache", userData.baseUrl), undefined, 3, false, "json");
  } catch (err) {
    console.error("Error downloading the datafiles");
    throw err;
  }
}

async function installDb(dexieUser: UserState) {
  if (!dexieUser?.user?.username || !dexieUser?.user?.accessToken) {
    console.error("Got an uninitialised dexieUser");
    postMessage({
      source: DATA_SOURCE,
      type: "error",
      value: { isFinished: false, message: { phrase: "sqlite.installerror" } },
    });
    return;
  }
  store.dispatch(setUser(dexieUser));
  await installDbFromParts(dexieUser);

  postMessage({
    source: DATA_SOURCE,
    type: "finished",
    value: { isFinished: true, message: { phrase: "database.sqlinstalled" } },
  });
}

addEventListener(
  "message",
  (event) => {
    if (Object.hasOwn(event.data, "vscodeScheduleAsyncWork")) {
      // rubbish from the monaco editor...
      return;
    }
    console.log("Got a sqlite install worker message with an event", event);
    if (event.data.type === "install") {
      installDb(event.data.value);
    } else {
      console.debug("Got an invalid message to sqlite install worker", event);
    }
  },
  { once: true },
);
