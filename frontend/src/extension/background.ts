import dayjs from "dayjs";
import { store } from "../app/createStore";
import { getUserDexie } from "../database/authdb";
import { getDb } from "../database/Database";
import { GRADE, TranscrobesDatabase } from "../database/Schema";
import { setUser, throttledRefreshToken } from "../features/user/userSlice";
import * as data from "../lib/data";
import * as utils from "../lib/libMethods";
import {
  DEFAULT_RETRIES,
  EventData,
  EVENT_QUEUE_PROCESS_FREQ,
  SerialisableDayCardWords,
  UserDefinitionType,
} from "../lib/types";

let db: TranscrobesDatabase;
let dayCardWords: SerialisableDayCardWords | null;
const dictionaries: Record<string, Record<string, UserDefinitionType>> = {};
let eventQueueTimer: number | undefined;

// function stopEventsSender(): void {
//   clearTimeout(eventQueueTimer);
// }

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
    console.log("Trying to get", dictionaryId, dictionaries);
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
  const progressCallback = (progressMessage: string, isFinished: boolean) => {
    const progress = { message: progressMessage, isFinished };
    console.debug("Got the progress message in background.js", progress);
    // WARNING: MUST NOT SEND A RESPONSE HERE!!!!!
    // sendResponse({source: message.source, type: message.type + "-progress", value: progress});
  };
  store.dispatch(throttledRefreshToken());

  const dbConfig = { url: new URL(store.getState().userData.baseUrl), username: store.getState().userData.username };
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

chrome.action.onClicked.addListener(function (tab) {
  getUserDexie().then((userData) => {
    if (tab.id) {
      if (!userData.username || !userData.password || !userData.baseUrl) {
        chrome.runtime.openOptionsPage(() => console.debug("User not initialised"));
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          files: ["content-bundle.js"],
        });
      }
    } else {
      // FIXME: is this useful
      chrome.runtime.openOptionsPage(() => console.log("No tab.id, not sure how we get here!"));
    }
  });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const message = request;
  const debug = console.debug;
  if (message.type === "syncDB") {
    console.log("Starting a background syncDB db load");
    loadDb(sendResponse, message);
  } else if (message.type === "showOptions") {
    chrome.runtime.openOptionsPage(() => console.debug("Show options from", message.source));
  } else if (message.type === "heartbeat") {
    sendResponse({ source: message.source, type: message.type, value: dayjs().format() });
  } else if (message.type === "getByIds") {
    loadDb(debug, message).then((ldb) => {
      data.getByIds(ldb, message.value).then((values) => {
        sendResponse({ source: message.source, type: message.type, value: values });
      });
    });
  } else if (message.type === "getWordFromDBs") {
    loadDb(debug, message).then((ldb) => {
      data.getWordFromDBs(ldb, message.value).then((values) => {
        sendResponse({ source: message.source, type: message.type, value: values });
      });
    });
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
  } else if (message.type === "submitUserEvents") {
    loadDb(console.debug, message).then((ldb) => {
      data.submitUserEvents(ldb, message.value).then(() => {
        sendResponse({
          source: message.source,
          type: message.type,
          value: "User Events submitted",
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
        });
    });
  } else if (message.type === "getUser") {
    getUserDexie().then((user) => {
      sendResponse({ source: message.source, type: message.type, value: user });
    });
  } else if (message.type === "updateRecentSentences") {
    loadDb(console.debug, message).then((ldb) => {
      data.updateRecentSentences(ldb, message.value).then((result) => {
        sendResponse({ source: message.source, type: message.type, value: result });
      });
    });
  } else if (message.type === "addRecentSentences") {
    loadDb(console.debug, message).then((ldb) => {
      data.addRecentSentences(ldb, message.value).then((result) => {
        sendResponse({ source: message.source, type: message.type, value: result });
      });
    });
  } else if (message.type === "getRecentSentences") {
    loadDb(console.debug, message).then((ldb) => {
      data.getRecentSentences(ldb, message.value).then((result) => {
        sendResponse({ source: message.source, type: message.type, value: result });
      });
    });
  } else if (message.type === "getContentConfigFromStore") {
    loadDb(console.debug, message).then((ldb) => {
      data.getContentConfigFromStore(ldb, message.value).then((result) => {
        sendResponse({ source: message.source, type: message.type, value: result });
      });
    });
  } else if (message.type === "setContentConfigToStore") {
    loadDb(console.debug, message).then((ldb) => {
      data.setContentConfigToStore(ldb, message.value).then((result) => {
        sendResponse({ source: message.source, type: message.type, value: result });
      });
    });
  } else if (message.type === "getDictionaryEntries") {
    loadDb(console.debug, message).then((ldb) => {
      getUserDictionary(ldb, message.value.dictionaryId).then((entries) => {
        sendResponse({ source: message.source, type: message.type, value: entries });
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
  } else if (message.type === "getAllFromDB") {
    loadDb(console.debug, message).then((ldb) => {
      data.getAllFromDB(ldb, message.value).then((result) => {
        sendResponse({ source: message.source, type: message.type, value: result });
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
  } else {
    console.warn("An unknown message type was submitted!", message);
  }
  return true;
});
