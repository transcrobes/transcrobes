// Adapted from https://raw.githubusercontent.com/rpl/idb-file-storage/master/src/idb-file-storage.js
// with all the window and FF-specific references removed and making the "options" parameters actually
// optional (by placing in square brackets).
// FIXME: this should be converted to TS!

/**
 * @typedef {Object} IDBFileStorage.ListFilteringOptions
 * @property {string} startsWith
 *   A string to be checked with `fileNameString.startsWith(...)`.
 * @property {string} endsWith
 *   A string to be checked with  `fileNameString.endsWith(...)`.
 * @property {string} includes
 *   A string to be checked with `fileNameString.includes(...)`.
 * @property {function} filterFn
 *   A function to be used to check the file name (`filterFn(fileNameString)`).
 */
type ListFilteringOptions = {
  startsWith?: string;
  endsWith?: string;
  includes?: string;
  filterFn?: (fileNameString: string) => boolean;
};

type WaitForDOMRequestType = {};

/**
 * Wraps a DOMRequest into a promise, optionally transforming the result using the onsuccess
 * callback.
 *
 * @param {IDBRequest|DOMRequest} req
 *   The DOMRequest instance to wrap in a Promise.
 * @param {function}  [onsuccess]
 *   An optional onsuccess callback which can transform the result before resolving it.
 *
 * @returns {Promise}
 *   The promise which wraps the request result, rejected if the request.onerror has been
 *   called.
 */
export function waitForDOMRequest(req: IDBRequest, onsuccess?: (res: any) => any) {
  return new Promise((resolve, reject) => {
    req.onsuccess = onsuccess ? () => resolve(onsuccess(req.result)) : () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Provides a Promise-based API to store files into an IndexedDB.
 *
 * Instances of this class are created using the exported
 * {@link getFileStorage} function.
 */
export class IDBFileStorage {
  private name: string;
  private persistent: boolean;
  private indexedDBName: string;
  private objectStorageName: string = "IDBFilesObjectStorage";
  // private initializedPromise: Promise;
  private initializedPromise: any;
  private version: number = 1.0;

  /**
   * @private private helper method used internally.
   */
  constructor(name: string, persistent: boolean) {
    // All the following properties are private and it should not be needed
    // while using the API.
    this.name = name;
    this.persistent = persistent;
    this.indexedDBName = `IDBFilesStorage-DB-${this.name}`;
    this.initializedPromise = undefined;
  }

  initializedDB(): Promise<IDBDatabase> {
    if (this.initializedPromise) {
      return this.initializedPromise;
    }

    this.initializedPromise = (async () => {
      const dbReq = indexedDB.open(this.indexedDBName, this.version);

      dbReq.onupgradeneeded = () => {
        const db = dbReq.result;
        if (!db.objectStoreNames.contains(this.objectStorageName)) {
          db.createObjectStore(this.objectStorageName);
        }
      };

      return waitForDOMRequest(dbReq);
    })();

    return this.initializedPromise;
  }

  private getObjectStoreTransaction(idb: IDBDatabase, mode: IDBTransactionMode = "readwrite") {
    const transaction = idb.transaction([this.objectStorageName], mode);
    return transaction.objectStore(this.objectStorageName);
  }

  /**
   * Put a file object into the IDBFileStorage, it overwrites an existent file saved with the
   * fileName if any.
   *
   * @param {string} fileName
   *   The key associated to the file in the IDBFileStorage.
   * @param {Blob|File} file
   *   The file to be persisted.
   *
   * @returns {Promise}
   *   A promise resolved when the request has been completed.
   */
  async put(fileName: string, file: Blob | File) {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb, "readwrite");
    return waitForDOMRequest(objectStore.put(file, fileName)) as Promise<string>;
  }

  /**
   * Remove a file object from the IDBFileStorage.
   *
   * @param {string} fileName
   *   The fileName (the associated IndexedDB key) to remove from the IDBFileStorage.
   *
   * @returns {Promise}
   *   A promise resolved when the request has been completed.
   */
  async remove(fileName: string) {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb, "readwrite");
    return waitForDOMRequest(objectStore.delete(fileName));
  }

  /**
   * List the names of the files stored in the IDBFileStorage.
   *
   * (If any filtering options has been specified, only the file names that match
   * all the filters are included in the result).
   *
   * @param {IDBFileStorage.ListFilteringOptions} [options]
   *   The optional filters to apply while listing the stored file names.
   *
   * @returns {Promise<string[]>}
   *   A promise resolved to the array of the filenames that has been found.
   */
  async list(options?: ListFilteringOptions) {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb);
    const allKeys = (await waitForDOMRequest(objectStore.getAllKeys())) as string[];

    let filteredKeys = allKeys;

    if (options) {
      filteredKeys = filteredKeys.filter((key) => {
        let match = true;

        if (options.startsWith) {
          match = match && key.startsWith(options.startsWith);
        }

        if (options.endsWith) {
          match = match && key.endsWith(options.endsWith);
        }

        if (options.includes) {
          match = match && key.includes(options.includes);
        }

        if (options.filterFn) {
          match = match && options.filterFn(key);
        }

        return match;
      });
    }

    return filteredKeys;
  }

  /**
   * Count the number of files stored in the IDBFileStorage.
   *
   * (If any filtering options has been specified, only the file names that match
   * all the filters are included in the final count).
   *
   * @param {IDBFileStorage.ListFilteringOptions} [options]
   *   The optional filters to apply while listing the stored file names.
   *
   * @returns {Promise<number>}
   *   A promise resolved to the number of files that has been found.
   */
  async count(options: ListFilteringOptions): Promise<number> {
    if (!options) {
      const idb = await this.initializedDB();
      const objectStore = this.getObjectStoreTransaction(idb);
      return waitForDOMRequest(objectStore.count()) as Promise<number>;
    }

    const filteredKeys = await this.list(options);
    return filteredKeys.length;
  }

  /**
   * Retrieve a file stored in the IDBFileStorage by key.
   *
   * @param {string} fileName
   *   The key to use to retrieve the file from the IDBFileStorage.
   *
   * @returns {Promise<Blob|File>}
   *   A promise resolved once the file stored in the IDBFileStorage has been retrieved.
   */
  async get(fileName: string): Promise<Blob | File> {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb);
    return waitForDOMRequest(objectStore.get(fileName)).then((result) => {
      return result;
    }) as Promise<Blob | File>;
  }

  /**
   * Remove all the file objects stored in the IDBFileStorage.
   *
   * @returns {Promise}
   *   A promise resolved once the IDBFileStorage has been cleared.
   */
  async clear() {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb, "readwrite");
    return waitForDOMRequest(objectStore.clear());
  }
}

/**
 * Retrieve an IDBFileStorage instance by name (and it creates the indexedDB if it doesn't
 * exist yet).
 *
 * @param {Object} [param]
 * @param {string} [param.name="default"]
 *   The name associated to the IDB File Storage.
 * @param {boolean} [param.persistent]
 *   Optionally enable persistent storage mode (not enabled by default).
 *
 * @returns {IDBFileStorage}
 *   The IDBFileStorage instance with the given name.
 */
export async function getFileStorage(name: string = "default", persistent: boolean = true) {
  const filesStorage = new IDBFileStorage(name, persistent);
  await filesStorage.initializedDB();
  return filesStorage;
}
