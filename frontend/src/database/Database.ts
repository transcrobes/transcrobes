import _ from "lodash";
import { addRxPlugin, clone, createRxDatabase, removeRxDatabase } from "rxdb";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { getRxStorageDexie } from "rxdb/plugins/dexie";
import { RxDBMigrationPlugin } from "rxdb/plugins/migration";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import {
  pullQueryBuilderFromRxSchema,
  pushQueryBuilderFromRxSchema,
  RxDBReplicationGraphQLPlugin,
  RxGraphQLReplicationState,
} from "rxdb/plugins/replication-graphql";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { store } from "../app/createStore";
import { setUser, throttledRefreshToken } from "../features/user/userSlice";
import { getFileStorage, IDBFileStorage } from "../lib/IDBFileStorage";
import { fetchPlus } from "../lib/libMethods";
import { API_PREFIX, IS_DEV } from "../lib/types";
import { RxDBDataProviderParams } from "../ra-data-rxdb";
import { getUserDexie } from "./authdb";
import {
  BATCH_SIZE_PULL,
  BATCH_SIZE_PUSH,
  DBCollections,
  DBPullCollectionKeys,
  DBPullCollections,
  DBTwoWayCollectionKeys,
  DBTwoWayCollections,
  DefinitionDocument,
  LIVE_INTERVAL,
  LIVE_INTERVAL_WITH_SUBSCRIPTION,
  reloadRequired,
  TranscrobesCollections,
  TranscrobesDatabase,
} from "./Schema";

import { createClient } from "graphql-ws";

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
addRxPlugin(RxDBReplicationGraphQLPlugin);

let dbPromise: Promise<TranscrobesDatabase> | null;

const LOADED_DEF_QUERY_ENTRY = "代码库"; // const LOADED_QUERY_ENTRY = '写进';
const LOADED_CHAR_QUERY_ENTRY = "代";
const EXPORTS_LIST_PATH = API_PREFIX + "/enrich/exports.json";
const HZEXPORTS_LIST_PATH = API_PREFIX + "/enrich/hzexports.json";

function getDatabaseName(config: RxDBDataProviderParams): string {
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
  syncURL: string,
  reinitialise: boolean,
  justCreated: boolean,
  initialisationCacheName: string,
  progressCallback: (message: string, finished: boolean) => void,
) {
  const initialisationCache = await getFileStorage(initialisationCacheName);

  // FIXME: this is NASTY!!!
  const baseUrl = new URL(syncURL).origin;

  if (reinitialise && (await initialisationCache.list()).length > 0) {
    console.debug("The initialisation cache existing and we want to reinitialise, deleting");
    await initialisationCache.clear();
  }
  let cacheFiles: string[];
  const existingKeys = await initialisationCache.list();
  console.debug("Found the following existing items in the cache", existingKeys);
  if (justCreated && !reinitialise && existingKeys.length > 0) {
    // we have unsuccessfully started an initialisation, and want to continue from where we left off
    console.debug("Using the existing keys of the cache because", justCreated, reinitialise, existingKeys.length);
    cacheFiles = existingKeys;
  } else {
    cacheFiles = await cacheExports(baseUrl, initialisationCache, progressCallback);
    console.debug("Refreshed the initialisation cache with new values", cacheFiles);
  }
  progressCallback("The data files have been downloaded, loading to the database : 13% complete", false);

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
    progressCallback(`Importing file ${i} : initialisation ${percent}% complete`, false);
  }
  progressCallback("Updating indexes : initialisation 90% complete", false);
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

async function cacheExports(
  baseUrl: string,
  initialisationCache: IDBFileStorage,
  progressCallback: (message: string, finished: boolean) => void,
) {
  // Add the word definitions database urls
  const exportFilesListURL = new URL(EXPORTS_LIST_PATH, baseUrl);
  let data;
  try {
    data = await fetchPlus(exportFilesListURL);
  } catch (error: any) {
    progressCallback(
      "There was an error downloading the data files. Please try again in a few minutes and if you get this message again, contact Transcrobes support: ERROR!",
      false,
    );
    console.error(error);
    throw new Error(error);
  }
  // Add the hanzi character database urls
  const hanziExportFilesListURL = new URL(HZEXPORTS_LIST_PATH, baseUrl);
  let hanziList;
  try {
    hanziList = await fetchPlus(hanziExportFilesListURL);
  } catch (error: any) {
    progressCallback(
      "There was an error downloading the data files. Please try again in a few minutes and if you get this message again, contact Transcrobes support: ERROR!",
      false,
    );
    console.error(error);
    throw new Error(error);
  }
  data.push(...hanziList);

  const entryBlock = async (url: string, origin: string) => {
    let response;
    try {
      response = await fetchPlus(new URL(url, origin));
    } catch (error) {
      const message =
        "There was an error downloading the data files. Please try again in a few minutes and if you get this message again, contact Transcrobes support: ERROR!";
      console.error(message, error);
      progressCallback(message, false);
      throw new Error(message);
    }
    progressCallback("Retrieved data file: " + url.split("/").slice(-1)[0], false);
    return await initialisationCache.put(url, new Blob([JSON.stringify(response)], { type: "application/json" }));
  };
  await Promise.all(data.map((x: string) => entryBlock(x, baseUrl)));
  return await initialisationCache.list();
}

function refreshTokenIfRequired(
  // FIXME: any
  replicationState: RxGraphQLReplicationState<any>,
  error: any,
) {
  try {
    // this is currently a string, but could be made to be json, meaning an elegant parse of the error. But I suck...
    const expiredMessage = error.innerErrors && error.innerErrors[0].message?.toString();
    if (expiredMessage?.includes('{"statusCode":"403","detail":"Could not validate credentials"}')) {
      console.debug("Looks like the token has expired, trying to refresh");
      store.dispatch(throttledRefreshToken());
      // FIXME: this will set rubbish until the refresh actually happens - is this worth trying to improve upon?
      replicationState.setHeaders(getHeaders(store.getState().userData.user.accessToken));
    } else {
      console.log("There was an error but apparently not an expiration", expiredMessage);
      console.error(error);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function setupTwoWayReplication(
  db: TranscrobesDatabase,
  colName: DBTwoWayCollectionKeys,
  syncURL: string,
  jwtAccessToken: string,
) {
  // set up replication
  console.debug(`Start ${colName} replication`);
  const headers = getHeaders(jwtAccessToken);

  // WARNING! pushQueryBuilderFromRxSchema modifies the input paramater object in place!
  const pushQuery = pushQueryBuilderFromRxSchema(_.camelCase(colName), clone(DBTwoWayCollections[colName]));
  // WARNING! pullQueryBuilderFromRxSchema modifies the input paramater object in place!
  const pullQuery = pullQueryBuilderFromRxSchema(
    _.camelCase(colName),
    clone(DBTwoWayCollections[colName]),
    BATCH_SIZE_PULL,
  );
  const replicationState = db[colName].syncGraphQL({
    url: syncURL,
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
    /**
     * Because the websocket is used to inform the client
     * when something has changed,
     * we can set the liveInterval to a high value
     */
    liveInterval: 1000 * (DBTwoWayCollections[colName].subscription ? LIVE_INTERVAL_WITH_SUBSCRIPTION : LIVE_INTERVAL),
    deletedFlag: "deleted",
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
  colName: DBPullCollectionKeys,
  syncURL: string,
  jwtAccessToken: string,
) {
  console.debug("Start pullonly replication", colName);
  const headers = getHeaders(jwtAccessToken);
  // WARNING! pullQueryBuilderFromRxSchema modifies the input paramater object in place!
  const col = clone(DBPullCollections[colName]) as any;

  // liveInterval is in ms, so seconds * 1000
  const liveInterval =
    "liveInterval" in col
      ? col.liveInterval
      : 1000 * (col.subscription ? LIVE_INTERVAL_WITH_SUBSCRIPTION : LIVE_INTERVAL);

  const pullQueryBuilder =
    "pullQueryBuilder" in col
      ? col.pullQueryBuilder
      : pullQueryBuilderFromRxSchema(_.camelCase(colName), col, BATCH_SIZE_PULL);

  const replicationState = db[colName].syncGraphQL({
    url: syncURL,
    headers: headers,
    pull: {
      queryBuilder: pullQueryBuilder,
      batchSize: BATCH_SIZE_PULL,
    },
    live: true,
    liveInterval,
    deletedFlag: "deleted",
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
      await db.removeCollection(colName);
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
  return (await db.definitions.findByIds(["670"])).size === 0; // look for "de", if exists, we aren't new
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

function changedQuery(obj: string) {
  return `
  subscription onChanged${obj}($token: String!) {
    changed${obj}(token: $token) {
      id
    }
  }
`;
}

function setupGraphQLSubscription(
  replicationState: RxGraphQLReplicationState<any>,
  query: string,
  wsEndpointUrl: string,
  jwtAccessToken: string,
) {
  const client = createClient({
    url: wsEndpointUrl,
    lazy: false,
    keepAlive: 10_000,
    on: {
      connected: () => {
        console.debug("SubscriptionClient.connected for", query);
      },
      error(error) {
        console.warn("run() got error:", query, error);
      },
    },
    retryAttempts: 10_000,
    shouldRetry: () => true,
    connectionParams: () => {
      store.dispatch(throttledRefreshToken());
      const token = store.getState().userData.user.accessToken || "";
      return { token };
    },
  });

  (async () => {
    const onNext = (data: any) => {
      console.debug("subscription emitted => trigger run()", data);

      if (!!data.errors && data.errors.length > 0) {
        console.error(data.errors);
      }
      replicationState.notifyAboutRemoteChange();
    };

    let unsubscribe = () => {
      console.log("The unsubscribe has been called");
    };

    await new Promise((resolve, reject) => {
      unsubscribe = client.subscribe(
        {
          query,
          variables: {
            token: jwtAccessToken,
          },
        },
        {
          next: onNext,
          error: (err: any) => {
            console.log("There was a client.subscribe error", err);
            reject();
          },
          complete: () => {
            console.log("The client.subscribe completed");
            resolve(null);
          },
        },
      );
    });
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
  accessToken: string,
  reinitialise = false,
  progressCallback: (message: string, finished: boolean) => void,
  sw?: ServiceWorkerGlobalScope,
): Promise<TranscrobesDatabase> {
  const activateSubscription = true;

  const dbName = getDatabaseName(config);

  // FIXME: externalise the string
  const syncURL = new URL("/api/v1/graphql", config.url.origin).href;
  const wsEndpointUrl = `ws${config.url.protocol === "https:" ? "s" : ""}://${config.url.host}/subscriptions`;
  const initialisationCacheName = "transcrobes.initialisation"; // was `${config.cacheName}.initialisation`;

  if (reinitialise) {
    await deleteDatabase(dbName);
  }
  const db = await createDatabase(dbName);
  let justCreated = false;

  try {
    justCreated = await createCollections(db);
  } catch (error) {
    console.error("Error trying to create the collections");
    console.error(error);
    progressCallback("RESTART_BROWSER", true);
    throw new Error("The browser must be restarted");
    // FIXME: NOOOOOOOOOOOOO!!!!!!!!!!!!!!!!!!
    //await removeRxDatabase(dbName, getRxStoragePouch("idb"));
    //db = await createDatabase(dbName);
    //justCreated = await createCollections(db);
  }
  if (justCreated || reinitialise) {
    progressCallback(`Retrieving data files : 1% complete`, false);
    await loadDatabase(db, syncURL, reinitialise, justCreated, initialisationCacheName, progressCallback);
  }
  progressCallback("The data files have been loaded into the database : 93% complete", false);
  const replStates = new Map<DBPullCollectionKeys | DBTwoWayCollectionKeys, RxGraphQLReplicationState<any>>();
  for (const col in DBTwoWayCollections) {
    replStates.set(
      col as DBTwoWayCollectionKeys,
      setupTwoWayReplication(db, col as DBTwoWayCollectionKeys, syncURL, accessToken),
    );
  }
  for (const col in DBPullCollections) {
    replStates.set(
      col as DBPullCollectionKeys,
      setupPullReplication(db, col as DBPullCollectionKeys, syncURL, accessToken),
    );
  }
  // This can take a while. It will freeze on this if no connection (so no good for offline-first)
  // but it won't be up-to-date otherwise...
  if (justCreated || reinitialise) {
    const rStates = [...replStates.values()];
    const colNames = [...replStates.keys()];

    const perPercent = 5 / colNames.length;
    for (const i in rStates) {
      progressCallback(`Synchronising ${colNames[i]} : ${(perPercent * parseInt(i) + 93).toFixed(2)}% complete`, false);
      await rStates[i].awaitInitialReplication();
    }
  }

  progressCallback("The collections have been synchronised : 98% complete", false);

  if (activateSubscription) {
    for (const [key, state] of replStates.entries()) {
      if (DBCollections[key].subscription) {
        const name = key.charAt(0).toUpperCase() + key.slice(1).replaceAll("_", "");
        setupGraphQLSubscription(state, changedQuery(name), wsEndpointUrl, accessToken);
      }
    }
  }
  return testQueries(db).then(() => {
    progressCallback("The indexes have now been generated. The initialisation has finished! : 100% complete", true);
    return db;
  });
}

async function getDb(
  config: RxDBDataProviderParams,
  progressCallback: (message: string, finished: boolean) => void,
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
    store.dispatch(throttledRefreshToken());
    if (!userData.user.accessToken) {
      throw new Error("No access token");
    }
  }
  if (!dbPromise) {
    dbPromise = loadFromExports(config, userData.user.accessToken, reinitialise, progressCallback);
  }
  const prom = await dbPromise;
  if (!prom) throw Error("DB Promise has not resolved properly");

  return prom;
}

export { getDb, getDatabaseName, deleteDatabase, unloadDatabaseFromMemory };
