// Copyright 2022 Roy T. Hashimoto. All Rights Reserved.

// IndexedDB transactions older than this will be replaced.
const MAX_TRANSACTION_LIFETIME_MILLIS = 5_000;

// For debugging.
let nextTxId = 0;
const mapTxToId = new WeakMap();
function log(...args) {
  // console.debug(...args);
}

// This class manages IDBTransaction and IDBRequest instances. It tries
// to reuse transactions to minimize transaction overhead.
export class IDBContext {
  #db: IDBDatabase;
  #dbReady: Promise<IDBDatabase>;
  #txOptions;

  #tx: IDBTransaction | null = null;
  #txTimestamp = 0;
  #runChain = Promise.resolve();
  #putChain = Promise.resolve();

  constructor(idbDatabase: IDBDatabase | Promise<IDBDatabase>, txOptions = { durability: "default" }) {
    this.#dbReady = Promise.resolve(idbDatabase).then((db) => (this.#db = db));
    this.#txOptions = txOptions;
  }

  async close() {
    const db = this.#db ?? (await this.#dbReady);
    await this.#runChain;
    await this.sync();
    db.close();
  }

  /**
   * Run a function with the provided object stores. The function
   * should be idempotent in case it is passed an expired transaction.
   */
  async run(mode: IDBTransactionMode, f: (stores: { [s: string]: ObjectStore }) => any) {
    // Ensure that functions run sequentially.
    const result = this.#runChain.then(() => this.#run(mode, f));
    this.#runChain = result.catch(() => {});
    return result;
  }

  async #run(mode: IDBTransactionMode, f: (stores: { [s: string]: ObjectStore }) => any) {
    const db = this.#db ?? (await this.#dbReady);
    if (mode === "readwrite" && this.#tx?.mode === "readonly") {
      // Mode requires a new transaction.
      this.#tx = null;
    } else if (performance.now() - this.#txTimestamp > MAX_TRANSACTION_LIFETIME_MILLIS) {
      // Chrome times out transactions after 60 seconds so refresh preemptively.
      try {
        this.#tx?.commit();
      } catch (e: any) {
        // Explicit commit can fail but this can be ignored if it will
        // auto-commit anyway.
        if (e.name !== "InvalidStateError") throw e;
      }

      // Skip to the next task to allow processing.
      await new Promise((resolve) => setTimeout(resolve));
      this.#tx = null;
    }

    // Run the user function with a retry in case the transaction is invalid.
    for (let i = 0; i < 2; ++i) {
      if (!this.#tx) {
        // @ts-ignore
        this.#tx = db.transaction(db.objectStoreNames, mode, this.#txOptions);
        const timestamp = (this.#txTimestamp = performance.now());

        // Chain the result of every transaction. If any transaction is
        // aborted then the next sync() call will throw.
        this.#putChain = this.#putChain.then(() => {
          return new Promise((resolve, reject) => {
            this.#tx!.addEventListener("complete", (event) => {
              resolve();
              if (this.#tx === event.target) {
                this.#tx = null;
              }
              if (event.target) log(`transaction ${mapTxToId.get(event.target)} complete`);
            });
            this.#tx!.addEventListener("abort", (event) => {
              console.warn("tx abort", (performance.now() - timestamp) / 1000);
              // @ts-ignore
              const e = event.target.error;
              reject(e);
              if (this.#tx === event.target) {
                this.#tx = null;
              }
              if (event.target) log(`transaction ${mapTxToId.get(event.target)} aborted`, e);
            });
          });
        });

        log(`new transaction ${nextTxId} ${mode}`);
        mapTxToId.set(this.#tx, nextTxId++);
      }

      try {
        const stores = Object.fromEntries(
          Array.from(db.objectStoreNames, (name) => {
            return [name, new ObjectStore(this.#tx!.objectStore(name))];
          }),
        );
        return await f(stores);
      } catch (e) {
        this.#tx = null;
        if (i) throw e;
        // console.warn('retrying with new transaction');
      }
    }
  }

  async sync() {
    // Wait until all transactions since the previous sync have committed.
    // Throw if any transaction failed.
    await this.#putChain;
    this.#putChain = Promise.resolve();
  }
}

function wrapRequest(request: IDBRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

// IDBObjectStore wrapper passed to IDBContext run functions.
class ObjectStore {
  #objectStore;

  constructor(objectStore: IDBObjectStore) {
    this.#objectStore = objectStore;
  }

  get(query: IDBValidKey | IDBKeyRange): Promise<any> {
    log(`get ${this.#objectStore.name}`, query);
    const request = this.#objectStore.get(query);
    return wrapRequest(request);
  }

  getAll(query: IDBValidKey | IDBKeyRange, count: number): Promise<any> {
    log(`getAll ${this.#objectStore.name}`, query, count);
    const request = this.#objectStore.getAll(query, count);
    return wrapRequest(request);
  }

  getKey(query: IDBValidKey | IDBKeyRange): Promise<IDBValidKey> {
    log(`getKey ${this.#objectStore.name}`, query);
    const request = this.#objectStore.getKey(query);
    return wrapRequest(request);
  }
  getAllKeys(query: IDBValidKey | IDBKeyRange, count: number): Promise<any> {
    log(`getAllKeys ${this.#objectStore.name}`, query, count);
    const request = this.#objectStore.getAllKeys(query, count);
    return wrapRequest(request);
  }
  put(value: any, key?: IDBValidKey): Promise<any> {
    log(`put ${this.#objectStore.name}`, value, key);
    const request = this.#objectStore.put(value, key);
    return wrapRequest(request);
  }
  delete(query: IDBValidKey | IDBKeyRange): Promise<any> {
    log(`delete ${this.#objectStore.name}`, query);
    const request = this.#objectStore.delete(query);
    return wrapRequest(request);
  }

  clear() {
    log(`clear ${this.#objectStore.name}`);
    const request = this.#objectStore.clear();
    return wrapRequest(request);
  }

  index(name: any) {
    return new Index(this.#objectStore.index(name));
  }
}

class Index {
  #index: IDBIndex;
  constructor(index: IDBIndex) {
    this.#index = index;
  }

  getAllKeys(query: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]> {
    log(`IDBIndex.getAllKeys ${this.#index.objectStore.name}<${this.#index.name}>`, query, count);
    const request = this.#index.getAllKeys(query, count);
    return wrapRequest(request);
  }
}
