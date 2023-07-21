import { fetchPlus } from "../../lib/libMethods";
import { DBParameters } from "../../lib/types";
import { getDb } from "../../workers/rxdb/Database";
import { DatabaseService as RxDatabaseService } from "../../workers/rxdb/DatabaseService";
import { DatabaseService, DatabaseService as SqlDatabaseService } from "../../workers/sqlite/DatabaseService";

import * as SQLite from "wa-sqlite";

import { ASYNC_SQLITE } from "../../workers/sqlite/DatabaseService";

const DATA_SOURCE = "EXT_INSTALL";
export const sqlite3Ready = ASYNC_SQLITE.esmFactory().then((module) => {
  return SQLite.Factory(module);
});

export async function installRxdb(dbConfig: DBParameters, progressCallback: (progress: any) => void) {
  return await getDb(dbConfig, progressCallback, () => {}, true);
  // await unloadDatabaseFromMemory();
}
const MAX_INSERTS = 50000;

export async function installSqlite(origin: string, progressCallback: (progress: any) => void) {
  const databaseService = new DatabaseService(sqlite3Ready, () => {}, ASYNC_SQLITE.vfs);
  progressCallback({
    source: DATA_SOURCE,
    isFinished: false,
    message: { phrase: "sqlite.backgroundworker.downloading" },
  });
  const text: string = await fetchPlus(new URL("/api/v1/enrich/dbexports/tc.sql", origin), undefined, 0, false, "text");
  console.log("got the file, starting to import", text.slice(0, 500));
  progressCallback({
    source: DATA_SOURCE,
    isFinished: false,
    message: { phrase: "sqlite.backgroundworker.installing" },
  });

  await databaseService.query(`PRAGMA page_size=65536;VACUUM;`);

  let sql = "";
  let i = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("PRAGMA") || line.startsWith("BEGIN TRANSACTION") || line.startsWith("COMMIT")) {
      continue;
    }
    sql += line + "\n";
    i++;
    // I guess there is still a chance that there are text fields with a ; in them followed by a newline... but I'm not going to worry about that :-)
    if (i > MAX_INSERTS && line.endsWith(";")) {
      console.log(`Inserting ~${MAX_INSERTS} rows`, sql.slice(0, 500));
      await databaseService.query(`BEGIN TRANSACTION;${sql};COMMIT;`);
      sql = "";
      i = 0;
    }
  }
  if (sql) {
    // there's some leftovers
    await databaseService.query(`BEGIN TRANSACTION;${sql};COMMIT;`);
    sql = "";
  }
  progressCallback({
    source: DATA_SOURCE,
    isFinished: true,
    message: { phrase: "sqlite.backgroundworker.installed" },
  });
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
