import * as SQLite from "wa-sqlite";
import { fetchPlus } from "../../lib/libMethods";
import { DBParameters, TCDB_FILENAME, UserState } from "../../lib/types";
import { asyncPoolAllBuffers } from "../../workers/common-db";
import { getDb } from "../../workers/rxdb/Database";
import { DatabaseService as RxDatabaseService } from "../../workers/rxdb/DatabaseService";
import { ASYNC_SQLITE, DatabaseService as SqlDatabaseService } from "../../workers/sqlite/DatabaseService";
import { IDBBatchAtomicVFS } from "../../workers/sqlite/IDBBatchAtomicVFS";
import * as VFS from "../../workers/sqlite/sqlite-constants.js";
import { MAX_TRANSACTION_LIFETIME_MILLIS } from "../../workers/sqlite/IDBContext";

const DATA_SOURCE = "EXT_INSTALL";
export const sqlite3Ready = ASYNC_SQLITE.esmFactory().then((module) => {
  return SQLite.Factory(module);
});

export async function installRxdb(dbConfig: DBParameters, progressCallback: (progress: any) => void) {
  return await getDb(dbConfig, progressCallback, () => {}, true);
  // await unloadDatabaseFromMemory();
}
const BLOCK_SIZE = 10_485_760;
const PAGE_SIZE = 32768;
const FILE_ID = 0xdeadbeef;

export async function installDbFromParts(userData: UserState, progressCallback: (progress: any) => void) {
  const entryBlock = async (partName: string) => {
    const ab = await fetchPlus(
      new URL(`/api/v1/enrich/dbexports/${partName}`, userData.baseUrl),
      undefined,
      3,
      false,
      "arrayBuffer",
    );
    progressCallback({
      source: DATA_SOURCE,
      isFinished: false,
      message: { phrase: "database.datafile", options: { datafile: partName } },
    });
    const partNo = parseInt(partName.replace("tc.db.", "").replace(".part", ""));
    return {
      partNo,
      ab,
    };
  };

  // FIXME: nastiness!!! You MUST open a few at least MAX_TRANSACTION_LIFETIME_MILLIS before starting to write...
  // this is because the VFS is "temperamental"...
  const start = performance.now();

  const vfs = new IDBBatchAtomicVFS(`/${TCDB_FILENAME}`);
  await vfs.isReady;
  const filename = TCDB_FILENAME;
  let result = await vfs.xOpen(
    filename,
    FILE_ID,
    VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE | VFS.SQLITE_OPEN_MAIN_DB,
    new DataView(new ArrayBuffer(8)),
  );

  const data = await fetchPlus(new URL("/api/v1/enrich/dbexports.json", userData.baseUrl), undefined, 3, false, "json");
  try {
    const allBuffers = await asyncPoolAllBuffers(2, data, entryBlock);
    allBuffers.sort((a, b) => a.partNo - b.partNo);

    await new Promise((resolve) => setTimeout(resolve, MAX_TRANSACTION_LIFETIME_MILLIS - (performance.now() - start)));

    for (const { partNo, ab } of allBuffers) {
      if (ab.byteLength % PAGE_SIZE !== 0) throw new Error("The little file is not a multiple of the page size");
      const blockStart = partNo * BLOCK_SIZE;
      console.log("Importing the buffer", partNo, ab.byteLength, blockStart);
      for (let i = 0; i < ab.byteLength; i += PAGE_SIZE) {
        result += await vfs.xWrite(FILE_ID, new Uint8Array(ab.slice(i, i + PAGE_SIZE)), blockStart + i);
      }
    }
    console.log("xsync", await vfs.xSync(FILE_ID, 0));
    console.log("xclose", await vfs.xClose(FILE_ID));
    console.log("close", await vfs.close());
    await fetchPlus(new URL("/api/v1/enrich/decache", userData.baseUrl), undefined, 3, false, "json");
  } catch (err) {
    console.error("Error processing the datafiles");
    throw err;
  }
}

export function getRxdbService() {
  return new Promise<RxDatabaseService>((resolve, reject) => {
    const dbService = new RxDatabaseService(
      (message) => {
        if (message.isFinished) {
          resolve(dbService);
        }
      },
      () => {},
      false,
    );
  });
}

export function getSqliteService() {
  return new Promise<SqlDatabaseService>((resolve, reject) => {
    const dbService = new SqlDatabaseService(
      sqlite3Ready,
      (message) => {
        if (message.isFinished) {
          resolve(dbService);
        }
      },
      ASYNC_SQLITE.vfs,
    );
  });
}
