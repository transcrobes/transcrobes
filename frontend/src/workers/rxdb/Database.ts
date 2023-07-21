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
import { store } from "../../app/createStore";
import { getUserDexie } from "../../database/authdb";
import { setUser, throttledRefreshToken } from "../../features/user/userSlice";
import { CacheRefresh, DBParameters, IS_DEV, ProgressCallbackMessage, UserDetails } from "../../lib/types";
import {
  BATCH_SIZE_PULL,
  BATCH_SIZE_PUSH,
  DBCollections,
  DBPullCollectionKeys,
  DBPullCollections,
  DBSyncCollection,
  DBTeacherTwoWayCollectionKeys,
  DBTeacherTwoWayCollections,
  DBTwoWayCollectionKeys,
  DBTwoWayCollections,
  TranscrobesCollections,
  TranscrobesDatabase,
  TranscrobesDocumentTypes,
  reloadRequired,
} from "./Schema";

const DATA_SOURCE = "RXDB_DATABASE";

type PullableCollectionKeys = DBTwoWayCollectionKeys | DBTeacherTwoWayCollectionKeys | DBPullCollectionKeys;
export const replStates = new Map<PullableCollectionKeys, RxGraphQLReplicationState<TranscrobesDocumentTypes, any>>();

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

const EXPIRED_MESSAGE = '{"statusCode":"401","detail":"token_signature_has_expired"}';

function getDatabaseName(config: DBParameters): string {
  const baseName = "tc-" + config.username + "-" + config.url.hostname;
  return baseName.toLowerCase().replace(/[^\w\s]/g, "_");
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
function setupPullReplication(
  db: TranscrobesDatabase,
  colName: DBPullCollectionKeys,
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
      await db.removeCollectionDoc(colName, col.schema.version);
      await db.addCollections({ [colName]: col });
      reloadRequired.add("true");
    }
  }
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

function collectionChangedQuery() {
  return `
  subscription onCollectionChanged($token: String!) {
    collectionChanged(token: $token) {
      name
    }
  }
`;
}

function setupGraphQLSubscription(
  wsEndpointUrl: string,
  query: string,
  decacheCallback?: (refresh: CacheRefresh) => void,
) {
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
      const colName = data.data.collectionChanged?.name?.toLowerCase();
      console.debug("subscription emitted => trigger run()", colName);
      const col = replStates.get(colName);
      if (!col) {
        if (colName in DBSyncCollection) {
          console.error("No replication state for", colName, data);
        }
        return;
      }
      decacheCallback?.({ name: colName });
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

async function load(
  config: DBParameters,
  progressCallback: (progress: ProgressCallbackMessage) => void,
  user: UserDetails,
  decacheCallback?: (refresh: CacheRefresh) => void,
  reinitialise = false,
): Promise<TranscrobesDatabase> {
  const dbName = getDatabaseName(config);
  const syncURL = new URL("/api/v1/graphql", config.url.origin).href;
  const wsEndpointUrl = `ws${config.url.protocol === "https:" ? "s" : ""}://${config.url.host}/subscriptions`;
  const graphqlServerUrl: GraphQLServerUrl = {
    http: syncURL,
    ws: wsEndpointUrl,
  };
  if (reinitialise) {
    await deleteDatabase(dbName);
  }
  progressCallback({ source: DATA_SOURCE, message: { phrase: "database.init_structure" }, isFinished: false });
  const db = await createDatabase(dbName);
  await createCollections(db);
  for (const col in DBPullCollections) {
    replStates.set(
      col as DBPullCollectionKeys,
      setupPullReplication(db, col as DBPullCollectionKeys, graphqlServerUrl),
    );
  }
  for (const col in DBTwoWayCollections) {
    replStates.set(
      col as DBTwoWayCollectionKeys,
      setupTwoWayReplication(db, col as DBTwoWayCollectionKeys, graphqlServerUrl),
    );
  }
  if (user.isTeacher) {
    for (const col in DBTeacherTwoWayCollections) {
      replStates.set(
        col as DBTeacherTwoWayCollectionKeys,
        setupTwoWayReplication(db, col as DBTeacherTwoWayCollectionKeys, graphqlServerUrl),
      );
    }
  }
  const rStates = [...replStates.values()];
  for (const i in rStates) {
    progressCallback({
      source: DATA_SOURCE,
      message: { phrase: "database.synchronising", options: { collection: rStates[i].collection.name } },
      isFinished: false,
    });
    if (reinitialise) await rStates[i].awaitInitialReplication();
    else rStates[i].awaitInitialReplication();
  }

  progressCallback({ source: DATA_SOURCE, message: { phrase: "database.synchronised" }, isFinished: false });
  setupGraphQLSubscription(wsEndpointUrl, collectionChangedQuery(), decacheCallback);
  return db;
}

async function getDb(
  config: DBParameters,
  progressCallback: (progress: ProgressCallbackMessage) => void,
  decacheCallback?: (refresh: CacheRefresh) => void,
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
    dbPromise = load(config, progressCallback, userData.user, decacheCallback, reinitialise);
  }
  const prom = await dbPromise;
  if (!prom) throw Error("DB Promise has not resolved properly");

  return prom;
}

export { deleteDatabase, getDatabaseName, getDb, unloadDatabaseFromMemory };
