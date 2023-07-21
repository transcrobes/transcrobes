import * as Comlink from "comlink";
import { Runtime } from "webextension-polyfill";
import { getUserDexie } from "../database/authdb";
import { ExtServiceWorkerDataManager } from "../workers/proxies";
import { DatabaseService as RxDatabaseService } from "../workers/rxdb/DatabaseService";
import { rxdbDataManagerKeys } from "../workers/rxdb/rxdata";
import { ASYNC_SQLITE, DatabaseService as SqlDatabaseService } from "../workers/sqlite/DatabaseService";
import { sqliteDataManagerKeys } from "../workers/sqlite/sqldata";
import {
  backgroundWorkerManager,
  backgroundWorkerManagerKeys,
  backgroundWorkerTabManager,
  backgroundWorkerTabManagerKeys,
  getPolyglot,
  runImportEpub,
  runMain,
} from "./backgroundfn";
import { isMessagePort } from "./lib/adapter";
import { createBackgroundEndpoint } from "./lib/backgroundEndpoint";
import { sqlite3Ready } from "./lib/dbs";
import { cleanCache } from "./lib/modelsCache";
import streamerAutoPlay from "./streamerAutoPlay?script";
import { setupWebSockets } from "../workers/sqlite/sqlsync";
import { UserState } from "../lib/types";
import { store } from "../app/createStore";
import { setUser, throttledRefreshToken } from "../features/user/userSlice";

let bgwdm: ExtServiceWorkerDataManager;

async function setupBackground(userData: UserState) {
  store.dispatch(setUser(userData));
  store.dispatch(throttledRefreshToken() as any);
  if (bgwdm) return;
  bgwdm = new ExtServiceWorkerDataManager([
    {
      keys: rxdbDataManagerKeys,
      partial: new RxDatabaseService(
        (message) => {
          if (message.isFinished) {
            console.log("do something on rxdb loaded");
          }
        },
        () => {},
        false,
      ),
    },
    {
      keys: sqliteDataManagerKeys,
      partial: new SqlDatabaseService(
        sqlite3Ready,
        (message) => {
          if (message.isFinished) {
            setupWebSockets(userData);
          }
        },
        ASYNC_SQLITE.vfs,
      ),
    },
    { keys: backgroundWorkerManagerKeys, partial: { proxy: backgroundWorkerManager } },
    { keys: backgroundWorkerTabManagerKeys, partial: { proxy: backgroundWorkerTabManager } },
  ]);

  chrome.runtime.onConnect.addListener((port) => {
    if (isMessagePort(port)) return;
    Comlink.expose(bgwdm.proxy, createBackgroundEndpoint(port as Runtime.Port));
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.tab?.id && message.type in backgroundWorkerTabManager) {
      backgroundWorkerTabManager[message.type]({ value: message?.value, tabId: sender.tab.id }).then((value) => {
        sendResponse({ source: message.source, type: message.type, value });
      });
    } else {
      console.debug("No tab id found or invalid message", message);
    }
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  cleanCache();
  const userData = await getUserDexie();
  if (!tab?.id || !userData.username || !userData.password || !userData.baseUrl) {
    chrome.runtime.openOptionsPage(() => console.debug("User not initialised"));
    return;
  }

  await setupBackground(userData);
  runMain(tab, userData);
});

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  const userData = await getUserDexie();
  if (!tab?.id || !userData.username || !userData.password || !userData.baseUrl) {
    chrome.runtime.openOptionsPage(() => console.debug("User not initialised"));
    return;
  }
  await setupBackground(userData);
  if (item.srcUrl && !item.selectionText) {
    await runImportEpub(item, tab);
  } else if (!item.srcUrl) {
    if (!tab?.id) return;
    await runMain(tab, userData);
  }
});

chrome.scripting
  .registerContentScripts([
    {
      id: "nf",
      js: ["nf.iife.js"],
      persistAcrossSessions: true,
      matches: ["https://www.netflix.com/watch/*"],
      runAt: "document_start",
      world: "MAIN",
    },
  ])
  .catch((err) => console.warn("unexpected nf.iife.js error", err));

chrome.scripting
  .registerContentScripts([
    {
      id: "streamerAutoPlay",
      js: [streamerAutoPlay],
      persistAcrossSessions: true,
      matches: ["https://www.netflix.com/*", "https://v.youku.com/v_show/*"],
      runAt: "document_start",
    },
  ])
  .then(async () => {
    const userData = await getUserDexie();
    if (!userData.username || !userData.password || !userData.baseUrl) {
      return;
    }
  })
  .catch((err) => console.warn("unexpected streamerAutoPlay error", err));

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: "TCEPUBImporter",
    title: (await getPolyglot()).t("screens.extension.import.title"),
    contexts: ["link"],
    targetUrlPatterns: ["*://*/*"], // actually very few sites have links with .epub at the end...
  });
  chrome.contextMenus.create({
    id: "TCPageTranscrober",
    title: (await getPolyglot()).t("screens.extension.page.title"),
    contexts: ["page"],
    targetUrlPatterns: ["*://*/*"],
  });
  chrome.contextMenus.create({
    id: "TCSelectionTranscrober",
    title: (await getPolyglot()).t("screens.extension.selection.title"),
    contexts: ["selection"],
    targetUrlPatterns: ["*://*/*"],
  });
});
