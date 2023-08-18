import AsyncSQLiteESMFactory from "wa-sqlite/dist/wa-sqlite-async.mjs";
import SQLiteESMFactory from "wa-sqlite/dist/wa-sqlite.mjs";
import { ProgressCallbackMessage, TCDB_FILENAME } from "../../lib/types";
import { DataService } from "../DataService";
import { AccessHandlePoolVFS } from "./AccessHandlePoolVFS";
import { IDBBatchAtomicVFS } from "./IDBBatchAtomicVFS";
import { SqliteDataManager, setTagfunction, sqliteDataManager } from "./sqldata";
import type { SQLiteResults, TagFunction } from "./tag";
import { createTag } from "./tag";
export type SupportedVFS = typeof AccessHandlePoolVFS | typeof IDBBatchAtomicVFS;

export const SYNC_SQLITE = {
  vfs: AccessHandlePoolVFS,
  esmFactory: SQLiteESMFactory,
};

export const ASYNC_SQLITE = {
  vfs: IDBBatchAtomicVFS,
  esmFactory: AsyncSQLiteESMFactory,
};

export const ACTIVE_SQLITE = SYNC_SQLITE;

export class DatabaseService extends DataService<SqliteDataManager> {
  #isTransactionPending: () => boolean;
  #tag: TagFunction;
  #StorageClass: SupportedVFS;
  #sqlite3Ready: Promise<SQLiteAPI>;
  constructor(
    sqlite3Ready: Promise<SQLiteAPI>,
    progressCallback: (progress: ProgressCallbackMessage) => void,
    StorageClass: SupportedVFS,
  ) {
    super(sqliteDataManager);
    this.#sqlite3Ready = sqlite3Ready;
    this.chain = this.#initialize(progressCallback);
    this.#StorageClass = StorageClass;
  }

  async query(sql: string, values?: SQLiteCompatibleType[][]): Promise<SQLiteResults[]> {
    const result = this.chain.then(async () => {
      if (this.#isTransactionPending()) {
        console.log("In a trans, rolling back for", sql.slice(0, 1000), values);
        await this.#tag("ROLLBACK").catch(() => {});
      }
      return this.#tag(sql, values);
    });
    this.chain = result.catch((e) => {
      console.warn("Error in query", sql, values, e);
    });
    return await result;
  }
  async #initialize(progressCallback: (progress: ProgressCallbackMessage) => void) {
    const sqlite3 = await this.#sqlite3Ready;
    console.log("Initialising sqlite storage with", this.#StorageClass, sqlite3);

    // Create the database.
    const vfs = new this.#StorageClass(`/${TCDB_FILENAME}`);
    await vfs.isReady;

    console.log("Registering the vfs", vfs, sqlite3);
    sqlite3.vfs_register(vfs, true);
    const db = await sqlite3.open_v2(TCDB_FILENAME);
    // Create the query interface.
    this.#tag = createTag(sqlite3, db);
    setTagfunction(this.#tag);

    this.#isTransactionPending = () => !sqlite3.get_autocommit(db);

    if (this.#StorageClass === SYNC_SQLITE.vfs) {
      this.query(`
      PRAGMA locking_mode=exclusive;
      PRAGMA journal_mode=truncate;
      `);
    } else {
      // PRAGMA cache_size=-15000;
      console.log("Setting locking mode to exclusive");
      this.query(`
      PRAGMA locking_mode=exclusive;
      `);
    }

    progressCallback({ source: "SQLITEDS", isFinished: true, message: { phrase: "sqlite.webworker.loaded" } });
  }
}
