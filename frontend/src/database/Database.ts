import _ from "lodash";

import { SubscriptionClient } from "subscriptions-transport-ws";

import { addRxPlugin, createRxDatabase, removeRxDatabase } from "rxdb/plugins/core";

import {
  pullQueryBuilderFromRxSchema,
  pushQueryBuilderFromRxSchema,
  RxDBReplicationGraphQLPlugin,
  RxGraphQLReplicationState,
} from "rxdb/plugins/replication-graphql";

import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";

// TODO import these only in non-production build
// import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
// FIXME: only validate in dev and for not web extension (has `eval`)
import { RxDBValidatePlugin } from "rxdb/plugins/validate";
import { RxDBNoValidatePlugin } from "rxdb/plugins/no-validate";
import { RxDBDataProviderParams } from "../ra-data-rxdb";

import { RxDBMigrationPlugin } from "rxdb/plugins/migration";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";

import {
  DBCollections,
  DBTwoWayCollections,
  DBTwoWayCollectionKeys,
  DBPullCollectionKeys,
  DBPullCollections,
  BATCH_SIZE,
  LIVE_INTERVAL,
  TranscrobesDatabase,
  TranscrobesCollections,
  DefinitionDocument,
} from "./Schema";
import { getAccess, getUsername, refreshAccessToken } from "../lib/JWTAuthProvider";
import { getFileStorage, IDBFileStorage } from "../lib/IDBFileStorage";
import { API_PREFIX, fetchPlus } from "../lib/lib";

import { addPouchPlugin, getRxStoragePouch } from "rxdb";

addPouchPlugin(require("pouchdb-adapter-idb"));

addRxPlugin(RxDBQueryBuilderPlugin);

// FIXME: I'm not sure this works, I still get errors in the ext
if (process?.env?.NODE_ENV?.trim() === "development" && process?.env?.PLATFORM === "site") {
  addRxPlugin(RxDBValidatePlugin);
} else {
  addRxPlugin(RxDBNoValidatePlugin);
}
addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBReplicationGraphQLPlugin);

let dbPromise: Promise<TranscrobesDatabase> | null;
const LOADED_DEF_QUERY_ENTRY = "代码库"; // const LOADED_QUERY_ENTRY = '写进';
const LOADED_CHAR_QUERY_ENTRY = "代";
const EXPORTS_LIST_PATH = API_PREFIX + "/enrich/exports.json";
const HZEXPORTS_LIST_PATH = API_PREFIX + "/enrich/hzexports.json";

function getDatabaseName(config: RxDBDataProviderParams, username: string): string {
  if (config.test) {
    return "tmploadtest";
  } else {
    const baseName = "tc-" + username + "-" + config.url.hostname;
    return baseName.toLowerCase().replace(/[^\w\s]/g, "_");
  }
}

function getHeaders(accessToken: string) {
  return { Authorization: "Bearer " + accessToken };
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
  console.debug("initialisationCache", initialisationCache);

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
    console.debug(
      "Using the existing keys of the cache because",
      justCreated,
      reinitialise,
      existingKeys.length,
    );
    cacheFiles = existingKeys;
  } else {
    cacheFiles = await cacheExports(baseUrl, initialisationCache, progressCallback);
    console.log("Refreshed the initialisation cache with new values", cacheFiles);
  }

  progressCallback(
    "The data files have been downloaded, loading to the database : 13% complete",
    false,
  );

  const perFilePercent = 85 / cacheFiles.length;
  for (const i in cacheFiles) {
    const file = cacheFiles[i];
    const response = await initialisationCache.get(file);
    const content = JSON.parse(await response.text());
    console.debug(`Trying to import reponse from cache for file ${file}`, file, response, content);
    // FIXME: check whether all the inserts actually insert
    if (file.split("/").slice(-1)[0].startsWith("hanzi-")) {
      await db.characters.bulkInsert(content);
      // force immediate index refresh so if we restart, we are already mostly ready
      await db.characters.find().where("id").eq(LOADED_CHAR_QUERY_ENTRY).exec();
    } else {
      await db.definitions.bulkInsert(content);
      await db.definitions.find().where("graph").eq(LOADED_DEF_QUERY_ENTRY).exec();
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
    return await initialisationCache.put(
      url,
      new Blob([JSON.stringify(response)], { type: "application/json" }),
    );
  };
  const allBlocks = await Promise.all(data.map((x: string) => entryBlock(x, baseUrl)));
  console.debug("Promise.all result from download and caching of all file blocks", allBlocks);
  return await initialisationCache.list();
}

function refreshTokenIfRequired(
  url: URL,
  // FIXME: any
  replicationState: RxGraphQLReplicationState<any>,
  error: any,
) {
  try {
    // this is currently a string, but could be made to be json, meaning an elegant parse of the error. But I suck...
    const expiredMessage = error.innerErrors[0].message?.toString();
    console.log("The error message was", expiredMessage);
    if (expiredMessage.includes('{"statusCode":"403","detail":"Could not validate credentials"}')) {
      console.log("Looks like the token has expired, trying to refresh");
      refreshAccessToken(url).then(() => {
        getAccess().then((access) => {
          if (!access) {
            throw new Error("Unable to refresh the access token");
          }
          replicationState.setHeaders(getHeaders(access));
        });
      });
    } else {
      console.log("There was an error but apparently not an expiration");
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

  const replicationState = db[colName].syncGraphQL({
    url: syncURL,
    headers: headers,
    push: {
      queryBuilder: pushQueryBuilderFromRxSchema(
        _.camelCase(colName),
        DBTwoWayCollections[colName],
      ),
      batchSize: 10, // FIXME: this doesn't appear to do anything
    },
    pull: {
      queryBuilder: pullQueryBuilderFromRxSchema(
        _.camelCase(colName),
        DBTwoWayCollections[colName],
        BATCH_SIZE,
      ),
    },
    live: true,
    /**
     * Because the websocket is used to inform the client
     * when something has changed,
     * we can set the liveIntervall to a high value
     */
    liveInterval: 1000 * LIVE_INTERVAL, // liveInterval seconds * 1000
    deletedFlag: "deleted",
  });
  // show replication-errors in logs
  replicationState.error$.subscribe((err) => {
    console.error("replication two-way error:");
    console.dir(err);
    console.log("Attempting to refresh token two-way replication, if that was the issue");
    refreshTokenIfRequired(new URL(syncURL), replicationState, err);
  });
  // replicationState.change$.subscribe(change => {console.log("I just replicated something") && console.dir(change)});
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
  const col = DBPullCollections[colName] as any;
  const pullQueryBuilder =
    "pullQueryBuilder" in col
      ? col.pullQueryBuilder
      : pullQueryBuilderFromRxSchema(_.camelCase(colName), col, BATCH_SIZE);

  const replicationState = db[colName].syncGraphQL({
    url: syncURL,
    headers: headers,
    pull: {
      queryBuilder: pullQueryBuilder, // pullQueryBuilderFromRxSchema(_.camelCase(colName), DBPullCollections[colName], BATCH_SIZE)
    },
    live: true,
    liveInterval: 1000 * LIVE_INTERVAL, // liveInterval is in ms, so seconds * 1000
    deletedFlag: "deleted",
  });
  // show replication-errors in logs
  replicationState.error$.subscribe((err) => {
    console.error("replication error:");
    console.dir(err);
    console.log("Attempting to refresh token for pullonly, if that was the issue");
    refreshTokenIfRequired(new URL(syncURL), replicationState, err);
  });
  return replicationState;
}

async function createDatabase(dbName: string) {
  console.log(`Create new database ${dbName}...`);
  return await createRxDatabase<TranscrobesCollections>({
    name: dbName,
    storage: getRxStoragePouch("idb"),
    multiInstance: false,
  });
}

async function createCollections(db: TranscrobesDatabase) {
  console.log("Create collections...");
  await db.addCollections(DBCollections);
  // FIXME: this is no longer true but anyway
  return (await db.definitions.findByIds(["670"])).size === 0; // look for "de", if exists, we aren't new
}

async function deleteDatabase(dbName: string): Promise<void> {
  if (dbPromise) {
    console.log(`Delete existing database by object for ${dbName}...`);
    await (await dbPromise).remove();
  } else {
    console.log(`Delete existing database by name ${dbName}...`);
    await removeRxDatabase(dbName, getRxStoragePouch("idb"));
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
  // setup graphql-subscriptions for pull-trigger
  const wsClient = new SubscriptionClient(wsEndpointUrl, {
    reconnect: true,
    timeout: 1000 * 60,
    connectionCallback: () => {
      console.debug("SubscriptionClient.connectionCallback:");
    },
    reconnectionAttempts: 10000,
    inactivityTimeout: 10 * 1000,
    lazy: true,
  });
  console.debug("Subscribe to GraphQL Subscriptions");
  const ret = wsClient.request({
    query,
    /**
     * there is no method in javascript to set custom auth headers
     * at websockets. So we send the auth header directly as variable
     * @link https://stackoverflow.com/a/4361358/3443137
     */
    variables: {
      token: jwtAccessToken,
    },
  });
  ret.subscribe({
    next: async (data) => {
      // console.log("subscription emitted => trigger run()");
      // console.dir(data);

      if (!!data.errors && data.errors.length > 0) {
        console.error(data.errors);
      }
      await replicationState.run();
    },
    error(error) {
      console.log("run() got error:");
      console.error(error);
    },
  });
}

async function testQueries(db: TranscrobesDatabase): Promise<DefinitionDocument[] | null> {
  // This makes sure indexes are loaded into memory. After this everything on definitions
  // will be super fast!
  return await db.definitions.find().where("graph").eq(LOADED_DEF_QUERY_ENTRY).exec();
}

async function loadFromExports(
  config: RxDBDataProviderParams,
  username: string,
  accessToken: string,
  reinitialise = false,
  progressCallback: (message: string, finished: boolean) => void,
) {
  const activateSubscription = true;

  const dbName = getDatabaseName(config, username);

  // FIXME: externalise the string
  const syncURL = new URL("/api/v1/graphql", config.url.origin).href;
  const wsEndpointUrl = `ws${config.url.protocol === "https:" ? "s" : ""}://${
    config.url.host
  }/subscriptions`;
  const initialisationCacheName = "transcrobes.initialisation"; // was `${config.cacheName}.initialisation`;

  console.log("loading stuffs", syncURL, wsEndpointUrl);

  if (reinitialise) {
    await deleteDatabase(dbName);
  }
  let db = await createDatabase(dbName);
  let justCreated = false;

  try {
    justCreated = await createCollections(db);
  } catch (error) {
    console.log("killing the db!!!!!!!!!!!!!!!!!!!!!!");
    console.error(error);
    // FIXME: NOOOOOOOOOOOOO!!!!!!!!!!!!!!!!!!
    await removeRxDatabase(dbName, getRxStoragePouch("idb"));
    db = await createDatabase(dbName);
    justCreated = await createCollections(db);
  }
  if (justCreated || reinitialise) {
    await loadDatabase(
      db,
      syncURL,
      reinitialise,
      justCreated,
      initialisationCacheName,
      progressCallback,
    );
  }
  progressCallback("The data files have been loaded into the database : 98% complete", false);
  const replStates = new Map<
    DBPullCollectionKeys | DBTwoWayCollectionKeys,
    RxGraphQLReplicationState<any>
  >();
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
  if (activateSubscription) {
    for (const [key, state] of replStates.entries()) {
      if (DBCollections[key].subscription) {
        const name = key.charAt(0).toUpperCase() + key.slice(1).replaceAll("_", "");
        setupGraphQLSubscription(state, changedQuery(name), wsEndpointUrl, accessToken);
      }
    }
  }
  return testQueries(db).then((doc) => {
    console.debug(`Queried the db for ${LOADED_DEF_QUERY_ENTRY}:`, doc);
    progressCallback(
      "The indexes have now been generated. The initialisation has finished! : 100% complete",
      true,
    );
    return db;
  });
}

async function getDb(
  config: RxDBDataProviderParams,
  progressCallback: (message: string, finished: boolean) => void,
  reinitialise = false,
): Promise<TranscrobesDatabase> {
  const username = await getUsername();
  if (!username) {
    throw new Error("No username token");
  }

  let accessToken = await getAccess();
  if (!accessToken) {
    await refreshAccessToken(config.url);
    accessToken = await getAccess();
    if (!accessToken) {
      throw new Error("No access token");
    }
  }
  if (!dbPromise) {
    dbPromise = loadFromExports(config, username, accessToken, reinitialise, progressCallback);
  }
  const prom = await dbPromise;
  if (!prom) throw Error("DB Promise has not resolved properly");

  return prom;
}

export { getDb, getDatabaseName, deleteDatabase };
