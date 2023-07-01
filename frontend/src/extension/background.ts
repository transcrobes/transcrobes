import dayjs from "dayjs";
import Polyglot from "node-polyglot";
import { store } from "../app/createStore";
import { getDb, replStates } from "../database/Database";
import { GRADE, TranscrobesDatabase } from "../database/Schema";
import { getUserDexie } from "../database/authdb";
import { setUser, throttledRefreshToken } from "../features/user/userSlice";
import * as data from "../lib/data";
import { camelToSnakeCase, getLanguageFromPreferred } from "../lib/funclib";
import * as utils from "../lib/libMethods";
import {
  DEFAULT_RETRIES,
  EVENT_QUEUE_PROCESS_FREQ,
  EventData,
  ExtensionImportMessage,
  NetflixDetails,
  PolyglotMessage,
  STREAMER_DETAILS,
  SerialisableDayCardWords,
  StreamDetails,
  UserDefinitionType,
} from "../lib/types";
import scriptPath from "./content?script";
import importPopup from "./importPopup?script";
import { getRawYoukuData, getYoukuData } from "./yk";
import { syncDefs } from "../lib/componentMethods";

let db: TranscrobesDatabase;
let dayCardWords: SerialisableDayCardWords | null;
const dictionaries: Record<string, Record<string, UserDefinitionType>> = {};
let eventQueueTimer: number | undefined;

// function stopEventsSender(): void {
//   clearTimeout(eventQueueTimer);
// }
let polyglot: Polyglot;
async function getPolyglot() {
  if (polyglot) return polyglot;
  const langs = await chrome.i18n.getAcceptLanguages();
  polyglot = new Polyglot({
    phrases: utils.getMessages(getLanguageFromPreferred(langs)),
  });
  return polyglot;
}

const EVENT_SOURCE = "background.ts";

async function getLocalCardWords(message: EventData) {
  if (dayCardWords) {
    return Promise.resolve(dayCardWords);
  } else {
    const ldb = await loadDb(console.debug, message);
    const val = await data.getSerialisableCardWords(ldb);
    dayCardWords = val;
    return Promise.resolve(dayCardWords);
  }
}

async function getUserDictionary(ldb: TranscrobesDatabase, dictionaryId: string) {
  if (!dictionaries[dictionaryId]) {
    dictionaries[dictionaryId] = await data.getDictionaryEntries(ldb, { dictionaryId });
  }
  return dictionaries[dictionaryId];
}

// FIXME: any
async function loadDb(callback: any, message: EventData) {
  if (db) {
    callback({ source: message.source, type: message.type, value: "success" });
    return db;
  }
  clearTimeout(eventQueueTimer);
  const user = await getUserDexie();
  store.dispatch(setUser(user));

  console.debug("DB NOT loaded, (re)loading with items", user.username, user.baseUrl);
  if (!user) {
    console.error("No user found in db, cannot load");
    throw new Error("No user found in db, cannot load");
  }
  const progressCallback = (progressMessage: PolyglotMessage, isFinished: boolean) => {
    const progress = { message: progressMessage, isFinished };
    console.debug("Got the progress message in background.js", progress);
    // WARNING: MUST NOT SEND A RESPONSE HERE!!!!!
    // sendResponse({source: message.source, type: message.type + "-progress", value: progress});
  };
  store.dispatch(throttledRefreshToken() as any);
  const userData = store.getState().userData;
  const dbConfig = { url: new URL(userData.baseUrl), username: userData.username };
  const dbHandle = await getDb(dbConfig, progressCallback);
  db = dbHandle;
  self.tcb = db;
  if (!eventQueueTimer) {
    eventQueueTimer = setInterval(
      () => data.sendUserEvents(db, new URL(store.getState().userData.baseUrl)),
      EVENT_QUEUE_PROCESS_FREQ,
    ) as unknown as number; // typescript considers this is a nodejs setInterval, not worker.
  }
  callback({ source: message.source, type: message.type, value: "success" });
  return db;
}
const messages: {
  getNetflixData: NetflixDetails;
  getYoukuData?: StreamDetails;
  getImportMessage: ExtensionImportMessage;
} = {
  getNetflixData: {
    language: "",
    subs: {},
  },
  getImportMessage: { message: "", status: "ongoing" },
};

async function runMain(tab: chrome.tabs.Tab) {
  const userData = await getUserDexie();
  if (tab.id) {
    if (!userData.username || !userData.password || !userData.baseUrl) {
      chrome.runtime.openOptionsPage(() => console.debug("User not initialised"));
    } else {
      if (tab.url?.match(STREAMER_DETAILS.netflix.ui)) {
        const urls = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (lang) => {
            if (!localStorage.getItem("TCLang")) {
              localStorage.setItem("TCLang", lang);
              location.reload(); // reload so the content_script has a value from the beginning
            }
            // @ts-ignore
            const subs = window.nftts;
            // @ts-ignore
            const language = window.netflix?.reactContext?.models?.geo?.data?.locale?.id?.split("-")[0];
            return {
              subs,
              language,
            };
          },
          args: [userData.user.fromLang],
          world: "MAIN",
        });
        // safari doesn't return InjectionResults, it returns the values directly
        messages.getNetflixData = urls[0]?.result || urls[0];
      } else if (tab.url?.match(STREAMER_DETAILS.youku.ui)) {
        const raw = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getRawYoukuData,
          world: "MAIN",
        });
        ({ data: messages.getYoukuData } = getYoukuData(raw[0]?.result || raw[0]));
      }
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: [scriptPath],
      });
    }
  } else {
    // FIXME: is this useful
    chrome.runtime.openOptionsPage(() => console.log("No tab.id, not sure how we get here!"));
  }
}

async function pushFile(url: string, afile: Blob, filename: string): Promise<Response> {
  const apiEndPoint = new URL("/api/v1/enrich/import_file", url).href;
  const fd = new FormData();
  fd.append("afile", afile);
  fd.append("filename", filename);
  return await utils.fetchPlusResponse(apiEndPoint, fd);
}

async function runImportEpub(item: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  const userData = await getUserDexie();
  if (!userData.username || !userData.password || !userData.baseUrl) {
    chrome.runtime.openOptionsPage(() => console.debug("User not initialised"));
    return;
  }
  messages.getImportMessage = {
    message: (await getPolyglot()).t("screens.extension.import.checking", { linkUrl: item?.linkUrl || "" }),
    status: "ongoing",
  };
  if (!tab?.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: false },
    files: [importPopup],
  });
  let message = "screens.extension.import.link_error";
  let destUrl = "";
  const linkUrl = item?.linkUrl || "";
  let status: "ongoing" | "error" | "finished" = "error";
  if (linkUrl) {
    const resp = await utils.fetchPlusResponse(linkUrl);
    destUrl = resp.url;
    if (resp.ok && destUrl) {
      if (destUrl.endsWith(".epub")) {
        const bl = await resp.blob();
        if (["application/epub+zip", "application/epub"].includes(bl.type)) {
          messages.getImportMessage = {
            message: (await getPolyglot()).t("screens.extension.import.sending", { linkUrl, destUrl }),
            status: "ongoing",
          };
          const ldb = await loadDb(() => {}, { type: "syncDB", source: "background" });
          const filename = await data.createEpubImportFromURL(ldb, destUrl, item.selectionText || "");
          // this doesn't actually work at the moment...
          replStates.get("imports")!.reSync();
          const result = await pushFile(userData.baseUrl, bl, filename);
          if (result.ok) {
            message = "screens.extension.import.started";
            status = "finished";
          } else {
            console.error(result);
          }
        }
      }
    }
  }
  messages.getImportMessage = {
    message: (await getPolyglot()).t(message, { linkUrl, destUrl }),
    status,
  };
}

chrome.action.onClicked.addListener(runMain);

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  if (item.srcUrl && !item.selectionText) {
    await runImportEpub(item, tab);
  } else if (!item.srcUrl) {
    if (!tab?.id) return;
    await runMain(tab);
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
  .catch((err) => console.warn("unexpected error", err));

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "syncDB") {
    console.log("Starting a background syncDB db load");
    loadDb(sendResponse, message);
  } else if (message.type === "showOptions") {
    chrome.runtime.openOptionsPage(() => console.debug("Show options from", message.source));
  } else if (message.type === "heartbeat") {
    sendResponse({ source: message.source, type: message.type, value: dayjs().format() });
  } else if (["getImportMessage", "getYoukuData", "getNetflixData"].includes(message.type)) {
    sendResponse({ source: message.source, type: message.type, value: { data: messages[message.type] } });
  } else if (message.type === "getUser") {
    getUserDexie().then((user) => {
      sendResponse({ source: message.source, type: message.type, value: user });
    });
  } else if (message.type === "seekNetflix") {
    if (sender.tab?.id) {
      chrome.scripting
        .executeScript({
          target: { tabId: sender.tab?.id },
          func: (timestamp) => {
            const playManager: any = (window as any).netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
            const player = playManager?.getVideoPlayerBySessionId(playManager.getAllPlayerSessionIds()?.[0]);
            if (player && player.getCurrentTime) {
              player.seek(parseInt(timestamp) * 1000); // convert to ms
              return true;
            }
            return false;
          },
          args: [message.value],
          world: "MAIN",
        })
        .then((success) => {
          sendResponse({ source: message.source, type: message.type, value: success[0]?.result || success[0] });
        });
    } else {
      sendResponse({ source: message.source, type: message.type, value: false });
    }
  } else if (message.type === "getSerialisableCardWords") {
    getLocalCardWords(message).then((dayCW) => {
      sendResponse({
        source: message.source,
        type: message.type,
        value: dayCW,
      });
    });
  } else if (message.type === "submitLookupEvents") {
    loadDb(console.debug, message).then((ldb) => {
      data
        .submitLookupEvents(ldb, {
          lemmaAndContexts: message.value.lookupEvents,
          userStatsMode: message.value.userStatsMode,
          source: EVENT_SOURCE,
        })
        .then((values) => {
          console.debug("submitLookupEvents results in background.js", message, values);
          sendResponse({
            source: message.source,
            type: message.type,
            value: "Lookup Events submitted",
          });
        });
    });
  } else if (message.type === "addOrUpdateCardsForWord") {
    const practiceDetails = message.value;
    loadDb(console.debug, message).then((ldb) => {
      dayCardWords = null;
      data.addOrUpdateCardsForWord(ldb, practiceDetails).then((values) => {
        console.debug("addOrUpdateCardsForWord", message, values);
        sendResponse({ source: message.source, type: message.type, value: "Cards Practiced" });
      });
    });
  } else if (message.type === "practiceCardsForWord") {
    const practiceDetails = message.value;
    const { wordInfo, grade } = practiceDetails;
    loadDb(console.debug, message).then((ldb) => {
      getLocalCardWords(message).then((dayCW) => {
        data.practiceCardsForWord(ldb, practiceDetails).then((values) => {
          dayCW.allCardWordGraphs[wordInfo.graph] = null;
          if (grade > GRADE.UNKNOWN) {
            dayCW.knownCardWordGraphs[wordInfo.graph] = null;
            dayCW.knownWordIdsCounter[wordInfo.wordId] = dayCW.knownWordIdsCounter[wordInfo.wordId]
              ? dayCW.knownWordIdsCounter[wordInfo.wordId] + 1
              : 1;
          }
          console.debug("Practiced", message, values);
          sendResponse({ source: message.source, type: message.type, value: "Cards Practiced" });
        });
      });
    });
  } else if (message.type === "sentenceTranslation") {
    console.debug("Translating sentence", message.value);
    loadDb(console.debug, message).then(() => {
      utils
        .fetchPlus(
          store.getState().userData.baseUrl + "/api/v1/enrich/translate", // FIXME: hardcoded nastiness
          JSON.stringify({ data: message.value }),
          DEFAULT_RETRIES,
        )
        .then((translation) => {
          if (typeof translation !== "string" && translation?.detail) {
            translation = "!!! Error translating, please refresh the page and try again !!!";
          }
          sendResponse({ source: message.source, type: message.type, value: translation });
        });
    });
  } else if (message.type === "serverGet") {
    loadDb(console.debug, message).then(() => {
      const { url, retries, isText } = message.value;
      utils
        .fetchPlusResponse(store.getState().userData.baseUrl + url, undefined, retries, false, !isText)
        .then((result) => {
          if (result.ok) {
            const res = isText ? result.text() : result.json();
            res.then((data) => {
              sendResponse({
                source: message.source,
                type: message.type,
                value: { data },
              });
            });
          } else {
            sendResponse({
              source: message.source,
              type: message.type,
              value: { error: result.statusText },
            });
          }
        })
        .catch((e) => {
          sendResponse({
            source: message.source,
            type: message.type,
            value: { error: e },
          });
        });
    });
  } else if (message.type === "enrichText") {
    loadDb(console.debug, message).then(() => {
      utils
        .fetchPlus(
          store.getState().userData.baseUrl + "/api/v1/enrich/enrich_json",
          JSON.stringify({ data: message.value }),
          DEFAULT_RETRIES,
        )
        .then((parse) => {
          sendResponse({
            source: message.source,
            type: message.type,
            value: [parse, message.value],
          });
        })
        .catch((e) => {
          sendResponse({
            source: message.source,
            type: message.type,
            value: e,
          });
        });
    });
  } else if (message.type === "streamingTitleSearch") {
    loadDb(console.debug, message).then(() => {
      const converted: any = {};
      const sd: StreamDetails = message.value;
      for (const [key, value] of Object.entries(sd)) {
        converted[camelToSnakeCase(key)] = value;
      }
      utils
        .fetchPlusResponse(
          `${store.getState().userData.baseUrl}/api/v1/enrich/streaming_title_search`,
          JSON.stringify(converted),
        )
        .then((result) => {
          if (result.ok) {
            result.json().then((data) => {
              sendResponse({
                source: message.source,
                type: message.type,
                value: { data },
              });
            });
          } else {
            sendResponse({
              source: message.source,
              type: message.type,
              value: { error: result.statusText },
            });
          }
        })
        .catch((e) => {
          sendResponse({
            source: message.source,
            type: message.type,
            value: e,
          });
        });
    });
  } else if (message.type === "getContentAccuracyStatsForImport") {
    loadDb(console.debug, message).then((ldb) => {
      getLocalCardWords(message).then((dayCW) => {
        data.getContentAccuracyStatsForImport(ldb, message.value, dayCW).then((result) => {
          sendResponse({ source: message.source, type: message.type, value: result });
        });
      });
    });
  } else if (message.type === "getDictionaryEntriesByGraph") {
    loadDb(console.debug, message).then((ldb) => {
      const outputEntries: Record<string, UserDefinitionType> = {};
      getUserDictionary(ldb, message.value.dictionaryId).then((entries) => {
        for (const graph of message.value.graphs) {
          outputEntries[graph] = entries[graph];
        }
        sendResponse({ source: message.source, type: message.type, value: outputEntries });
      });
    });
  } else if (
    [
      "getRecentSentences",
      "addRecentSentences",
      "getByIds",
      "getWordFromDBs",
      "submitActivityEvent",
      "submitUserEvents",
      "updateRecentSentences",
      "refreshSession",
      "getContentConfigFromStore",
      "setContentConfigToStore",
      "getDictionaryEntries",
      "getAllFromDB",
      "getWordsByGraphs",
      "forceDefinitionsSync",
    ].includes(message.type)
  ) {
    loadDb(console.debug, message).then((ldb) => {
      data[message.type](ldb, message.value).then((result: any) => {
        sendResponse({ source: message.source, type: message.type, value: result });
      });
    });
  } else {
    console.warn("An unknown message type was submitted to the background!", message);
  }
  return true;
});
