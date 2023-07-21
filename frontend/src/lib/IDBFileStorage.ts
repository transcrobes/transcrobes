// Adapted from https://raw.githubusercontent.com/rpl/idb-file-storage/master/src/idb-file-storage.js
// with all the window and FF-specific references removed and making the "options" parameters actually optional

type ListFilteringOptions = {
  startsWith?: string;
  endsWith?: string;
  includes?: string;
  filterFn?: (fileNameString: string) => boolean;
};

/**
 * Wraps a DOMRequest into a promise, optionally transforming the result using the onsuccess
 * callback.
 */
export function waitForDOMRequest(req: IDBRequest, onsuccess?: (res: any) => any): Promise<any> {
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
  private objectStorageName = "IDBFilesObjectStorage";
  // private initializedPromise: Promise;
  private initializedPromise: any;
  private version = 1.0;

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
   */
  async put(fileName: string, file: Blob | File): Promise<any> {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb, "readwrite");
    return waitForDOMRequest(objectStore.put(file, fileName)) as Promise<string>;
  }

  /**
   * Remove a file object from the IDBFileStorage.
   */
  async remove(fileName: string): Promise<any> {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb, "readwrite");
    return waitForDOMRequest(objectStore.delete(fileName));
  }

  /**
   * List the names of the files stored in the IDBFileStorage.
   *
   * (If any filtering options has been specified, only the file names that match
   * all the filters are included in the result).
   */
  async list(options?: ListFilteringOptions): Promise<string[]> {
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
   */
  async clear(): Promise<any> {
    const idb = await this.initializedDB();
    const objectStore = this.getObjectStoreTransaction(idb, "readwrite");
    return waitForDOMRequest(objectStore.clear());
  }
}

export async function getFileStorage(name = "default", persistent = true): Promise<IDBFileStorage> {
  const filesStorage = new IDBFileStorage(name, persistent);
  await filesStorage.initializedDB();
  return filesStorage;
}
