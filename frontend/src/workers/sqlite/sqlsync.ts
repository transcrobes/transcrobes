import { ConstantBackoff, Websocket, WebsocketBuilder } from "../../websocket-ts";
import { doLogin } from "../../features/user/userSlice";
import { UserState } from "../../lib/types";
import {
  ManagedTable,
  forceDefinitionsSync,
  getCardTableLastUpdate,
  getKnownWords,
  getLatestUpdates,
  getTableLastUpdate,
  syncCardUpdates,
  syncContentQuestions,
  syncDayModelStats,
  syncFreeQuestions,
  syncImportUpdates,
  syncQuestions,
  syncUserDictionaryUpdates,
  syncWordModelStats,
  syncWordlistUpdates,
} from "./sqldata";

let collectionsUpdates: Websocket;
let definitionsUpdates: Websocket;

export async function syncAllTables(baseUrl: string) {
  syncTable(baseUrl, "Cards");
  syncTable(baseUrl, "Userdictionaries");
  syncTable(baseUrl, "Wordlists");
  syncTable(baseUrl, "Imports");
  syncTable(baseUrl, "word_model_stats");
  syncTable(baseUrl, "day_model_stats");
  syncTable(baseUrl, "Definitions");
  syncTable(baseUrl, "FreeQuestions");
  syncTable(baseUrl, "ContentQuestions");
  syncTable(baseUrl, "Questions");
}

export async function setupWebSockets(userData: UserState) {
  console.log("Starting to setupWebSockets");
  let ret = await doLogin(userData.username, userData.password, userData.baseUrl);
  const host = new URL(userData.baseUrl);
  collectionsUpdates = new WebsocketBuilder(`wss://${host.host}/api/v1/tables/collections_updates/${ret.accessToken}`)
    .onOpen(() => {
      console.log("Websocket open in worker");
    })
    .onMessage((ws, event) => {
      console.log("Websocket message received in worker", event.data);
      syncTable(userData.baseUrl, event.data);
    })
    .onError((ws, event) => {
      console.warn("Websocket collections error received in worker", event, ws);
      // if (event.code === 1006) {
      //   console.log("Websocket error 1006, reconnecting");
      //   ws.reconnect();
      // }
    })
    .withBackoff(new ConstantBackoff(1000))
    .build();

  definitionsUpdates = new WebsocketBuilder(`wss://${host.host}/api/v1/tables/definitions_updates/${ret.accessToken}`)
    .onOpen(() => {
      console.log("Definitions websocket open in worker");
    })
    .onMessage((ws, event) => {
      console.log("Definitions websocket message received in worker", event.data);
      syncTable(userData.baseUrl, "Definitions");
    })
    .onError((ws, event) => {
      console.warn("Websocket definitions error received in worker", event, ws);
      // if (event.code === 1006) {
      //   console.log("Websocket error 1006, reconnecting");
      //   ws.reconnect();
      // }
    })
    .withBackoff(new ConstantBackoff(1000))
    .build();
  console.log("set up setupWebSockets sockets, now syncing all tables");
  syncAllTables(userData.baseUrl);
}
async function syncTable(baseUrl: string, tableName: ManagedTable) {
  let latestUpdates: any[] = [];
  switch (tableName) {
    case "Definitions":
      await forceDefinitionsSync(baseUrl);
      break;
    case "word_model_stats":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        for (const obj of latestUpdates[tableName]) delete obj["deleted"];
        await syncWordModelStats(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "day_model_stats":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        for (const obj of latestUpdates[tableName]) delete obj["deleted"];
        await syncDayModelStats(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "Cards":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getCardTableLastUpdate());
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        // FIXME: do something with the deleteds..s
        for (const card of latestUpdates[tableName]) delete card["deleted"];
        await syncCardUpdates(latestUpdates[tableName]);
        postMessage({
          source: "SQL_WEB_WORKER",
          type: "decache",
          value: { name: "cards", values: await getKnownWords() },
        });
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "Userdictionaries":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        for (const obj of latestUpdates[tableName]) delete obj["deleted"];
        await syncUserDictionaryUpdates(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "Imports":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        for (const obj of latestUpdates[tableName]) delete obj["deleted"];
        await syncImportUpdates(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "Wordlists":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.["Wordlists"]?.length || 0 > 0) {
        for (const obj of latestUpdates[tableName]) {
          obj["is_default"] = obj["default"] ? 1 : 0;
          delete obj["default"];
          delete obj["deleted"];
        }
        for (const wordlist of latestUpdates["Wordlists"]) {
          await syncWordlistUpdates(wordlist);
        }
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "FreeQuestions":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        await syncFreeQuestions(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "ContentQuestions":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        await syncContentQuestions(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    case "Questions":
      latestUpdates = await getLatestUpdates(baseUrl, tableName, await getTableLastUpdate(tableName));
      if (latestUpdates?.[tableName]?.length || 0 > 0) {
        await syncQuestions(latestUpdates[tableName]);
      } else {
        console.warn(`No ${tableName} valid updates received`);
      }
      break;
    default:
      console.warn("Unknown table name", tableName);
  }
}
