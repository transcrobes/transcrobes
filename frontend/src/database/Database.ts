import { createClient } from "graphql-ws";
import _ from "lodash";
import { addRxPlugin, clone, createRxDatabase, removeRxDatabase } from "rxdb";
import { GraphQLServerUrl } from "rxdb/dist/types/types";
import { RxDBCleanupPlugin } from "rxdb/plugins/cleanup";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBMigrationPlugin } from "rxdb/plugins/migration";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import {
  RxGraphQLReplicationState,
  pullQueryBuilderFromRxSchema,
  pushQueryBuilderFromRxSchema,
  replicateGraphQL,
} from "rxdb/plugins/replication-graphql";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import asyncPool from "tiny-async-pool";
import { store } from "../app/createStore";
import { setUser, throttledRefreshToken } from "../features/user/userSlice";
import { IDBFileStorage, getFileStorage } from "../lib/IDBFileStorage";
import { fetchPlus } from "../lib/libMethods";
import { API_PREFIX, IS_DEV, PolyglotMessage, UserDetails } from "../lib/types";
import { DBParameters, RxDBDataProviderParams } from "../ra-data-rxdb";
import {
  BATCH_SIZE_PULL,
  BATCH_SIZE_PUSH,
  DBCollections,
  DBPullCollectionKeys,
  DBPullCollections,
  DBTeacherPullCollectionKeys,
  DBTeacherPullCollections,
  DBTeacherTwoWayCollectionKeys,
  DBTeacherTwoWayCollections,
  DBTwoWayCollectionKeys,
  DBTwoWayCollections,
  DefinitionDocument,
  TranscrobesCollections,
  TranscrobesDatabase,
  TranscrobesDocumentTypes,
  reloadRequired,
} from "./Schema";
import { getUserDexie } from "./authdb";

type PullableCollectionKeys =
  | DBPullCollectionKeys
  | DBTwoWayCollectionKeys
  | DBTeacherPullCollectionKeys
  | DBTeacherTwoWayCollectionKeys;
export const replStates = new Map<PullableCollectionKeys, RxGraphQLReplicationState<TranscrobesDocumentTypes, any>>();

declare const self: ServiceWorkerGlobalScope;

addRxPlugin(RxDBQueryBuilderPlugin);
if (IS_DEV) {
  // FIXME: this is currently broken due to is-my-json-valid multipleOf check
  // if (!IS_EXT) {
  //   addRxPlugin(RxDBValidatePlugin);
  // }
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBCleanupPlugin);

let dbPromise: Promise<TranscrobesDatabase> | null;

const LOADED_DEF_QUERY_ENTRY = "代码库"; // const LOADED_QUERY_ENTRY = '写进';
const LOADED_CHAR_QUERY_ENTRY = "代";
const EXPORTS_LIST_PATH = API_PREFIX + "/enrich/exports.json";
const HZEXPORTS_LIST_PATH = API_PREFIX + "/enrich/hzexports.json";

const EXPIRED_MESSAGE = '{"statusCode":"401","detail":"token_signature_has_expired"}';

function getDatabaseName(config: DBParameters): string {
  if (config.test) {
    return "tmploadtest";
  } else {
    const baseName = "tc-" + config.username + "-" + config.url.hostname;
    return baseName.toLowerCase().replace(/[^\w\s]/g, "_");
  }
}

function getHeaders(accessToken: string) {
  return { Authorization: "Bearer " + accessToken };
}

async function unloadDatabaseFromMemory(): Promise<void> {
  if (dbPromise) {
    // actually it unloads from memory, actually destroying is "remove()". Sigh...
    console.log("Unloading database from memory");
    const db = await dbPromise;
    if (db) await db.destroy();
    dbPromise = null;
  } else {
    console.log("Not unloading database from memory");
  }
}

async function loadDatabase(
  db: TranscrobesDatabase,
  graphqlServerUrl: GraphQLServerUrl,
  reinitialise: boolean,
  justCreated: boolean,
  initialisationCacheName: string,
  user: UserDetails,
  progressCallback: (message: PolyglotMessage, finished: boolean) => void,
) {
  progressCallback({ phrase: "database.init_temp_storage" }, false);
  const initialisationCache = await getFileStorage(initialisationCacheName);
  const baseUrl = new URL(graphqlServerUrl.http || "").origin;

  if (reinitialise && (await initialisationCache.list()).length > 0) {
    console.debug("The initialisation cache existing and we want to reinitialise, deleting");
    await initialisationCache.clear();
  }
  let cacheFiles: string[];
  const existingKeys = await initialisationCache.list();
  console.debug("Found the following existing items in the cache", existingKeys, justCreated);
  if (justCreated && !reinitialise && existingKeys.length > 0) {
    // we have unsuccessfully started an initialisation, and want to continue from where we left off
    console.debug("Using the existing keys of the cache because", justCreated, reinitialise, existingKeys.length);
    cacheFiles = existingKeys;
  } else {
    cacheFiles = await cacheExports(baseUrl, initialisationCache, user, progressCallback);
    console.debug("Refreshed the initialisation cache with new values", cacheFiles);
  }
  progressCallback({ phrase: "database.files_downloaded" }, false);

  const perFilePercent = 77 / cacheFiles.length;
  for (const i in cacheFiles) {
    const file = cacheFiles[i];
    const response = await initialisationCache.get(file);
    const content = JSON.parse(await response.text());
    // FIXME: check whether all the inserts actually insert
    if (file.split("/").slice(-1)[0].startsWith("hanzi-")) {
      await db.characters.bulkInsert(content);
    } else {
      await db.definitions.bulkInsert(content);
    }
    await initialisationCache.remove(file);
    const newList = await initialisationCache.list();
    const deleteResult = newList.filter((x) => x === file).length === 0;

    if (!deleteResult) {
      throw new Error("deleteResult is false, that is unfortunate");
    }
    const percent = (perFilePercent * parseInt(i) + 13).toFixed(2);
    progressCallback({ phrase: "database.importing", options: { i, percent } }, false);
  }
  progressCallback({ phrase: "database.updating_indexes" }, false);
  await db.definitions
    .find({
      selector: { graph: { $eq: LOADED_DEF_QUERY_ENTRY } },
    })
    .exec();
  await db.characters
    .find({
      selector: { id: { $eq: LOADED_CHAR_QUERY_ENTRY } },
    })
    .exec();
}

async function asyncPoolAll(poolLimit: number, array: string[], iteratorFn: (generator: string) => Promise<string>) {
  const results: any[] = [];
  for await (const result of asyncPool(poolLimit, array, iteratorFn)) {
    results.push(result);
  }
  return results;
}

async function cacheExports(
  baseUrl: string,
  initialisationCache: IDBFileStorage,
  user: UserDetails,
  progressCallback: (message: PolyglotMessage, finished: boolean) => void,
) {
  // Add the word definitions database urls
  const exportFilesListURL = new URL(EXPORTS_LIST_PATH, baseUrl);
  let data: string[];
  progressCallback({ phrase: "database.getting_cache_list" }, false);
  try {
    data = await fetchPlus(exportFilesListURL);
    console.log("data", data, exportFilesListURL);
  } catch (error: any) {
    progressCallback({ phrase: "database.cache_exports_error" }, false);
    console.error(error);
    throw new Error(error);
  }
  // FIXME: hardcoding... this will need to be changed when we add more languages
  if (user.fromLang === "zh-Hans") {
    try {
      // Add the hanzi character database urls
      const hanziExportFilesListURL = new URL(HZEXPORTS_LIST_PATH, baseUrl);
      const hanziList = await fetchPlus(hanziExportFilesListURL);
      data.push(...hanziList);
    } catch (error: any) {
      progressCallback({ phrase: "database.cache_exports_error" }, false);
      console.error(error);
      throw new Error(error);
    }
  }
  const entryBlock = async (url: string) => {
    const origin = baseUrl;
    let response: any;
    try {
      response = await fetchPlus(new URL(url, origin));
    } catch (error) {
      const message = "database.cache_exports_error";
      console.error(message, error);
      progressCallback({ phrase: message }, false);
      throw new Error(message);
    }
    progressCallback({ phrase: "database.datafile", options: { datafile: url.split("/").slice(-1)[0] } }, false);
    return await initialisationCache.put(url, new Blob([JSON.stringify(response)], { type: "application/json" }));
  };
  try {
    const results = await asyncPoolAll(2, data, entryBlock);
    console.log("Datafile results", results);
  } catch (err) {
    await initialisationCache.clear();
    console.error("Error downloading the datafiles");
    throw err;
  }

  return await initialisationCache.list();
}

function getErrorMessage(error: any) {
  const err = error.innerErrors || error.errors;
  return err[0].message?.toString();
}

function refreshTokenIfRequired(
  // FIXME: any
  replicationState: any,
  error: any,
) {
  try {
    // this is currently a string, but could be made to be json, meaning an elegant parse of the error. But I suck...
    const expiredMessage = getErrorMessage(error.parameters);
    if (expiredMessage?.includes(EXPIRED_MESSAGE)) {
      console.debug("Looks like the token has expired, trying to refresh");
      store.dispatch(throttledRefreshToken() as any);
      // FIXME: this will set rubbish until the refresh actually happens - is this worth trying to improve upon?
      replicationState.setHeaders(getHeaders(store.getState().userData.user.accessToken));
    } else {
      console.log("There was an error but apparently not an expiration", expiredMessage, error);
      console.error(error);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function setupTwoWayReplication(
  db: TranscrobesDatabase,
  colName: DBTwoWayCollectionKeys | DBTeacherTwoWayCollectionKeys,
  graphqlServerUrl: GraphQLServerUrl,
) {
  // set up replication
  console.debug(`Start ${colName} replication`);
  const headers = getHeaders(store.getState().userData.user.accessToken);

  // WARNING! pushQueryBuilderFromRxSchema modifies the input paramater object in place!
  const pushQuery = pushQueryBuilderFromRxSchema(_.camelCase(colName), clone(DBCollections[colName]));
  // WARNING! pullQueryBuilderFromRxSchema modifies the input paramater object in place!
  const pullQuery = pullQueryBuilderFromRxSchema(_.camelCase(colName), clone(DBCollections[colName]));

  const replicationState = replicateGraphQL<TranscrobesDocumentTypes, any>({
    url: graphqlServerUrl,
    headers: headers,
    push: {
      queryBuilder: pushQuery,
      // WARNING: this MUST be very large, or big collections will KILL the CPU for HOURS
      batchSize: BATCH_SIZE_PUSH,
    },
    pull: {
      queryBuilder: pullQuery,
      batchSize: BATCH_SIZE_PULL,
    },
    live: true,
    deletedField: "deleted",
    collection: db[colName],
  });

  // show replication-errors in logs
  // @ts-ignore
  replicationState.error$.subscribe((err) => {
    refreshTokenIfRequired(replicationState, err);
  });
  // @ts-ignore
  // replicationState.received$.subscribe((change: any) => {
  //   console.debug("I just replicated something down for", colName, change);
  // });
  // replicationState.send$.subscribe((change) => {
  //   console.debug("I just replicated something up for", colName, change);
  // });

  return replicationState;
}

function setupPullReplication(
  db: TranscrobesDatabase,
  colName: DBPullCollectionKeys | DBTeacherPullCollectionKeys,
  graphqlServerUrl: GraphQLServerUrl,
) {
  console.debug("Start pullonly replication", colName);
  const headers = getHeaders(store.getState().userData.user.accessToken);
  // WARNING! pullQueryBuilderFromRxSchema modifies the input paramater object in place!
  const col = clone(DBCollections[colName]) as any;

  const pullQueryBuilder =
    "pullQueryBuilder" in col ? col.pullQueryBuilder : pullQueryBuilderFromRxSchema(_.camelCase(colName), col);

  const replicationState = replicateGraphQL<TranscrobesDocumentTypes, any>({
    url: graphqlServerUrl,
    headers: headers,
    pull: {
      queryBuilder: pullQueryBuilder,
      batchSize: BATCH_SIZE_PULL,
    },
    live: true,
    collection: db[colName],
    deletedField: "deleted",
  });
  // show replication-errors in logs
  // @ts-ignore
  replicationState.error$.subscribe((err) => {
    refreshTokenIfRequired(replicationState, err);
  });
  return replicationState;
}

async function createDatabase(dbName: string): Promise<TranscrobesDatabase> {
  console.debug(`Create database ${dbName}...`);
  if (dbPromise) {
    const db = await dbPromise;
    if (db) await db.destroy();
  }
  return await createRxDatabase<TranscrobesCollections>({
    name: dbName,
    storage: getRxStorageDexie(),
    multiInstance: false,
  });
}

async function createCollections(db: TranscrobesDatabase) {
  console.debug("Create collections...");
  for (const [colName, col] of Object.entries(DBCollections)) {
    try {
      await db.addCollections({ [colName]: col });
    } catch (error) {
      console.error(`Error adding collection ${colName}, removing and re-adding`, error);
      if (["definitions", "word_model_stats"].includes(colName)) {
        throw new Error(`Can't remove collection ${colName}, bailing`);
      }
      await db.removeCollectionDoc(colName, col.schema.version);
      await db.addCollections({ [colName]: col });
      reloadRequired.add("true");
    }
  }
  if (reloadRequired.size > 0 && self && typeof self.needsReload !== "undefined") {
    console.log(
      "reloadRequired.size > 0 && self && typeof self.needsReload !== undefined",
      reloadRequired,
      self.needsReload,
    );
    self.needsReload = true;
  }

  // FIXME: this is no longer true but anyway
  // look for "de" and "the", if exists, we aren't new
  return (await db.definitions.findByIds(["670", "253633"]).exec()).size === 0;
}

async function deleteDatabase(dbName: string): Promise<void> {
  if (dbPromise) {
    console.log(`Delete existing database by object for ${dbName}...`);
    const db = await dbPromise;
    if (db) {
      const removed = await db.remove();
      console.log(`Deleted existing database by object ${dbName}`, removed);
    }
  } else {
    console.log(`Delete existing database by name ${dbName}...`);
    const removed = await removeRxDatabase(dbName, getRxStorageDexie());
    console.log(`Deleted existing database by name ${dbName}`, removed);
  }
  dbPromise = null;
}

function changedQuery(collection: string) {
  return `
  subscription onChanged${_.upperFirst(collection)}($token: String!) {
    changed${_.upperFirst(collection)}(token: $token) {
      name
    }
  }
`;
}

function collectionChangedQuery() {
  return `
  subscription onCollectionChanged($token: String!) {
    collectionChanged(token: $token) {
      name
    }
  }
`;
}

function setupGraphQLSubscription(wsEndpointUrl: string, query: string, sw?: ServiceWorkerGlobalScope) {
  const client = createClient({
    url: wsEndpointUrl,
    lazy: false, // do NOT put this to true, it will mean many connections fail
    keepAlive: 10_000,
    on: {
      connected: () => {
        console.debug("SubscriptionClient.connected");
      },
      error(error) {
        console.warn("run() got error:", error);
      },
    },
    retryAttempts: 10_000,
    shouldRetry: () => true,
    connectionParams: () => {
      store.dispatch(throttledRefreshToken() as any);
      const token = store.getState().userData.user.accessToken || "";
      return { token };
    },
  });

  (async () => {
    const onNext = (data: any) => {
      if (!!data.errors && data.errors.length > 0) {
        console.error(data.errors);
      }
      const colName = data.data.collectionChanged?.name?.toLowerCase() || "definitions";
      console.debug("subscription emitted => trigger run()", colName);
      const col = replStates.get(colName);
      if (!col) {
        console.error("No replication state for", colName, data);
        return;
      }
      if (sw && colName === "cards") {
        console.debug("Nulling sw.dayCardWords after subscription resync");
        sw.dayCardWords = null;
      } else if (colName === "contents") {
        // We need to re-sync definitions as well
        console.debug("Running definitions resync before contents sub update");
        replStates.get("definitions")!.reSync();
      }
      col.reSync();
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve, reject) => {
        client.subscribe(
          {
            query,
            variables: {
              token: store.getState().userData.user.accessToken,
            },
          },
          {
            next: onNext,
            error: (err: any) => {
              console.error("There was a client.subscribe error", err);
              reject(err);
            },
            complete: () => {
              console.log("The client.subscribe completed");
              resolve(null);
            },
          },
        );
      })
        .then(() => {
          console.log("The subscription has been successfully setup");
        })
        .catch((err) => {
          if (err && err.message === EXPIRED_MESSAGE) {
            store.dispatch(throttledRefreshToken() as any);
          }
          console.error("The subscription setup failed for", err);
        });
      await new Promise((res) => setTimeout(res, 5000));
    }
  })();
}

async function testQueries(db: TranscrobesDatabase): Promise<DefinitionDocument[] | null> {
  // This makes sure indexes are loaded into memory. After this everything on definitions
  // will be super fast!
  return await db.definitions
    .find({
      selector: { graph: { $eq: LOADED_DEF_QUERY_ENTRY } },
      index: "graph",
    })
    .exec();
}

async function loadFromExports(
  config: RxDBDataProviderParams,
  reinitialise = false,
  progressCallback: (message: PolyglotMessage, finished: boolean) => void,
  user: UserDetails,
  sw?: ServiceWorkerGlobalScope,
): Promise<TranscrobesDatabase> {
  const activateSubscription = true;

  progressCallback({ phrase: "database.init_storage" }, false);

  const dbName = getDatabaseName(config);

  // FIXME: externalise the string
  const syncURL = new URL("/api/v1/graphql", config.url.origin).href;
  const wsEndpointUrl = `ws${config.url.protocol === "https:" ? "s" : ""}://${config.url.host}/subscriptions`;
  const graphqlServerUrl: GraphQLServerUrl = {
    http: syncURL,
    ws: wsEndpointUrl,
  };
  const initialisationCacheName = "transcrobes.initialisation"; // was `${config.cacheName}.initialisation`;

  if (reinitialise) {
    progressCallback({ phrase: "database.reinstalling" }, false);
    await deleteDatabase(dbName);
  }
  const db = await createDatabase(dbName);
  // FIXME: should be able to use this, which is a better way but doesn't work with typed dbs?
  // let justCreated = isRxDatabaseFirstTimeInstantiated(db);
  let justCreated = false;

  try {
    progressCallback({ phrase: "database.init_structure" }, false);
    justCreated = await createCollections(db);
  } catch (error) {
    console.error("Error trying to create the collections");
    console.error(error);
    progressCallback({ phrase: "RESTART_BROWSER" }, true);
    throw new Error("The browser must be restarted");
    // FIXME: NOOOOOOOOOOOOO!!!!!!!!!!!!!!!!!!
    //await removeRxDatabase(dbName, getRxStoragePouch("idb"));
    //db = await createDatabase(dbName);
    //justCreated = await createCollections(db);
  }
  if (justCreated || reinitialise) {
    progressCallback({ phrase: "database.retrieving_files" }, false);
    console.log(syncURL, reinitialise, justCreated, initialisationCacheName, user);
    await loadDatabase(
      db,
      graphqlServerUrl,
      reinitialise,
      justCreated,
      initialisationCacheName,
      user,
      progressCallback,
    );
  }
  progressCallback({ phrase: "database.files_loaded" }, false);
  for (const col in DBTwoWayCollections) {
    replStates.set(
      col as DBTwoWayCollectionKeys,
      setupTwoWayReplication(db, col as DBTwoWayCollectionKeys, graphqlServerUrl),
    );
  }
  for (const col in DBPullCollections) {
    replStates.set(
      col as DBPullCollectionKeys,
      setupPullReplication(db, col as DBPullCollectionKeys, graphqlServerUrl),
    );
  }
  if (user.isTeacher) {
    for (const col in DBTeacherPullCollections) {
      replStates.set(
        col as DBTeacherPullCollectionKeys,
        setupPullReplication(db, col as DBTeacherPullCollectionKeys, graphqlServerUrl),
      );
    }
    for (const col in DBTeacherTwoWayCollections) {
      replStates.set(
        col as DBTeacherTwoWayCollectionKeys,
        setupTwoWayReplication(db, col as DBTeacherTwoWayCollectionKeys, graphqlServerUrl),
      );
    }
  }

  // This can take a while. It will freeze on this if no connection (so no good for offline-first)
  // but it won't be up-to-date otherwise...
  if (justCreated || reinitialise) {
    const rStates = [...replStates.values()];
    const colNames = [...replStates.keys()];

    const perPercent = 5 / colNames.length;
    for (const i in rStates) {
      progressCallback(
        {
          phrase: "database.synchronising",
          options: {
            filename: colNames[i],
            percent: (perPercent * parseInt(i) + 93).toFixed(2),
          },
        },
        false,
      );
      // the initial repl takes MULTIPLE GIGABYTES of memory with lots of defs...
      // which we don't need to wait for and can free memory up before running
      if ("definitions" !== colNames[i]) {
        await rStates[i].awaitInitialReplication();
      }
    }
  } else {
    // we can't await this because it will block the UI and because it takes too much memory, it will crash the browser
    // if we do it just after creating (because of rxdb memory management...)
    replStates.get("definitions")!.awaitInitialReplication();
  }
  progressCallback({ phrase: "database.synchronised" }, false);
  if (activateSubscription) {
    setupGraphQLSubscription(wsEndpointUrl, collectionChangedQuery(), sw);
    setupGraphQLSubscription(wsEndpointUrl, changedQuery("definitions"), sw);
  }
  return testQueries(db).then(() => {
    progressCallback({ phrase: "database.init_finished" }, true);
    return db;
  });
}

async function getDb(
  config: RxDBDataProviderParams,
  progressCallback: (message: PolyglotMessage, finished: boolean) => void,
  sw?: ServiceWorkerGlobalScope,
  reinitialise = false,
): Promise<TranscrobesDatabase> {
  const userData = await getUserDexie();
  console.debug("Setting up the db in the database for user", userData.username);
  if (!userData) {
    console.error("No user found in db, cannot load from dexie");
    throw new Error("No user found in db, cannot load");
  }
  store.dispatch(setUser(userData));

  if (!userData || !userData.user.username) {
    throw new Error("No db username");
  }

  if (!userData.user.accessToken) {
    store.dispatch(throttledRefreshToken() as any);
    if (!userData.user.accessToken) {
      throw new Error("No access token");
    }
  }
  if (!dbPromise) {
    dbPromise = loadFromExports(config, reinitialise, progressCallback, userData.user, sw);
  }
  const prom = await dbPromise;
  if (!prom) throw Error("DB Promise has not resolved properly");

  return prom;
}

export { getDb, getDatabaseName, deleteDatabase, unloadDatabaseFromMemory };
