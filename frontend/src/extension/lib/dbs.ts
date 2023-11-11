import * as SQLite from "wa-sqlite";
import { IDBBatchAtomicVFS } from "wa-sqlite/src/examples/IDBBatchAtomicVFS";
import { fetchPlus } from "../../lib/libMethods";
import { DBParameters, TCDB_FILENAME, UserState } from "../../lib/types";
import { asyncPoolAllBuffers } from "../../workers/common-db";
import { getDb } from "../../workers/rxdb/Database";
import { DatabaseService as RxDatabaseService } from "../../workers/rxdb/DatabaseService";
import { ASYNC_SQLITE, DatabaseService as SqlDatabaseService } from "../../workers/sqlite/DatabaseService";

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

async function check(code) {
  if ((await code) !== SQLite.SQLITE_OK) {
    throw new Error(`Error code: ${code}`);
  }
}

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

  const data = await fetchPlus(new URL("/api/v1/enrich/dbexports.json", userData.baseUrl), undefined, 3, false, "json");
  const onFinally: any[] = [];
  try {
    const allBuffers = await asyncPoolAllBuffers(2, data, entryBlock);
    allBuffers.sort((a, b) => a.partNo - b.partNo);

    const vfs = new IDBBatchAtomicVFS(`/${TCDB_FILENAME}`);
    await vfs.isReady;
    const filename = TCDB_FILENAME;
    let result = await vfs.xOpen(
      filename,
      FILE_ID,
      SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_MAIN_DB,
      new DataView(new ArrayBuffer(8)),
    );
    // Open a "transaction".
    await check(vfs.xLock(FILE_ID, SQLite.SQLITE_LOCK_SHARED));
    onFinally.push(() => vfs.xUnlock(FILE_ID, SQLite.SQLITE_LOCK_NONE));
    await check(vfs.xLock(FILE_ID, SQLite.SQLITE_LOCK_RESERVED));
    onFinally.push(() => vfs.xUnlock(FILE_ID, SQLite.SQLITE_LOCK_SHARED));
    await check(vfs.xLock(FILE_ID, SQLite.SQLITE_LOCK_EXCLUSIVE));
    const ignored = new DataView(new ArrayBuffer(4));
    await vfs.xFileControl(FILE_ID, SQLite.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE, ignored);
    await check(vfs.xTruncate(FILE_ID, 0));

    for (const { partNo, ab } of allBuffers) {
      if (ab.byteLength % PAGE_SIZE !== 0) throw new Error("The little file is not a multiple of the page size");
      const blockStart = partNo * BLOCK_SIZE;
      console.log("Importing the buffer", partNo, ab.byteLength, blockStart);
      for (let i = 0; i < ab.byteLength; i += PAGE_SIZE) {
        result += await vfs.xWrite(FILE_ID, new Uint8Array(ab.slice(i, i + PAGE_SIZE)), blockStart + i);
      }
    }
    await vfs.xFileControl(FILE_ID, SQLite.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE, ignored);
    await vfs.xFileControl(FILE_ID, SQLite.SQLITE_FCNTL_SYNC, ignored);
    await vfs.xSync(FILE_ID, SQLite.SQLITE_SYNC_NORMAL);

    await fetchPlus(new URL("/api/v1/enrich/decache", userData.baseUrl), undefined, 3, false, "json");
  } catch (err) {
    console.error("Error processing the datafiles");
    throw err;
  } finally {
    while (onFinally.length) {
      await onFinally.pop()();
    }
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
