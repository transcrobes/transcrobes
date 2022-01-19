import * as utils from "../lib/lib";
import * as data from "../lib/data";
import { GRADE, TranscrobesDatabase } from "../database/Schema";
import { getDb } from "../database/Database";
import dayjs from "dayjs";
import { DayCardWords, EventData } from "../lib/types";
import { getPassword, getUsername, getValue, refreshAccessToken } from "../lib/JWTAuthProvider";

utils.setEventSource("chrome-extension");

let db: TranscrobesDatabase;

let dayCardWords: DayCardWords | null;

let eventQueueTimer: number | undefined;

// function stopEventsSender(): void {
//   clearTimeout(eventQueueTimer);
// }

const EVENT_SOURCE = "background.ts";

function getLocalCardWords(message: EventData) {
  if (dayCardWords) {
    console.log("i think already loaded");
    return Promise.resolve(dayCardWords);
  } else {
    return loadDb(console.debug, message).then((ldb) => {
      console.log("i am loading the cards");
      return data.getCardWords(ldb).then((val) => {
        dayCardWords = val;
        console.log("they are now i am loading the cards", dayCardWords);
        return Promise.resolve(dayCardWords);
      });
    });
  }
}

// FIXME: any
async function loadDb(callback: any, message: EventData) {
  if (db) {
    callback({ source: message.source, type: message.type, value: "success" });
    return db;
  }
  clearTimeout(eventQueueTimer);
  const items = await Promise.all([
    getUsername(),
    getPassword(),
    getValue("baseUrl"),
    getValue("glossing"),
    getValue("lang_pair"),
    getValue("segmentation"), // FIXME: why do I need this here again?
    getValue("mouseover"), // FIXME: why do I need this here again?
    // FIXME: maybe I need glossPosition et al. here also?
    getValue("collectRecents"),
  ]);
  console.debug("DB NOT loaded, (re)loading with items", db, items);
  utils.setUsername(
    items[0] ||
      (() => {
        throw new Error("Unable to get username");
      })(),
  );
  utils.setPassword(
    items[1] ||
      (() => {
        throw new Error("Unable to get password");
      })(),
  );
  const baseUrl = items[2] ? items[2] + (items[2].endsWith("/") ? "" : "/") : "";
  utils.setBaseUrl(baseUrl);
  utils.setGlossing(
    parseInt(
      items[3] ||
        (() => {
          throw new Error("Unable to get glossing");
        })(),
    ),
  );
  utils.setLangPair(
    items[4] ||
      (() => {
        throw new Error("Unable to get langPair");
      })(),
  );
  utils.setSegmentation(
    parseInt(
      items[5] ||
        (() => {
          throw new Error("Unable to get segmentation");
        })(),
    ) > 0,
  );
  utils.setMouseover(
    parseInt(
      items[6] ||
        (() => {
          throw new Error("Unable to get mouseover");
        })(),
    ) > 0,
  );
  utils.setCollectRecents(
    parseInt(
      items[7] ||
        (() => {
          throw new Error("Unable to get collectRecents");
        })(),
    ) > 0,
  );
  console.debug(
    "Set up with values",
    utils.username,
    utils.password,
    utils.baseUrl,
    utils.langPair,
    utils.glossing,
    utils.segmentation,
    utils.mouseover,
    utils.collectRecents,
  );

  const progressCallback = (progressMessage: string, isFinished: boolean) => {
    const progress = { message: progressMessage, isFinished };
    console.debug("Got the progress message in background.js", progress);
    // WARNING: MUST NOT SEND A RESPONSE HERE!!!!!
    // sendResponse({source: message.source, type: message.type + "-progress", value: progress});
  };
  await refreshAccessToken(new URL(utils.baseUrl));
  const dbConfig = { url: new URL(utils.baseUrl) };
  const dbHandle = await getDb(dbConfig, progressCallback);
  db = dbHandle;
  self.tcb = db;
  if (!eventQueueTimer) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    eventQueueTimer = setInterval(
      () => data.sendUserEvents(db, new URL(utils.baseUrl)),
      utils.EVENT_QUEUE_PROCESS_FREQ,
    );
  }
  callback({ source: message.source, type: message.type, value: "success" });
  return db;
}

chrome.action.onClicked.addListener(function (tab) {
  Promise.all([getUsername(), getPassword(), getValue("baseUrl")]).then((items: any[]) => {
    if (!items[0] || !items[1] || !items[2]) {
      // FIXME: this can't work in a service worker...
      alert(
        `You need an account on a Transcrobes server to Transcrobe a page. \n\nIf you have an account please fill in the options page (right-click on the Transcrobe Me! icon -> Extension Options) with your login information (username, password, server URL).\n\n For information on available servers or how to set one up for yourself, see the Transcrobes site https://transcrob.es`,
      );
    } else {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["webcomponents-sd-ce.js"],
        });
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content-bundle.js"],
        });
      }
    }
  });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const message = request;
  const debug = console.debug;
  if (message.type === "syncDB") {
    console.log("Starting a background syncDB db load");
    loadDb(sendResponse, message);
  } else if (message.type === "heartbeat") {
    console.debug("got a heartbeat request in sw.js, replying with datetime");
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
  } else if (message.type === "getCardWords") {
    getLocalCardWords(message).then((dayCW) => {
      sendResponse({
        source: message.source,
        type: message.type,
        value: {
          allCardWordGraphs: Array.from(dayCW.allCardWordGraphs),
          knownCardWordGraphs: Array.from(dayCW.knownCardWordGraphs),
          knownWordIdsCounter: dayCW.knownWordIdsCounter,
        },
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
  } else if (message.type === "practiceCardsForWord") {
    const practiceDetails = message.value;
    const { wordInfo, grade } = practiceDetails;
    loadDb(console.debug, message).then((ldb) => {
      getLocalCardWords(message).then((dayCW) => {
        data.practiceCardsForWord(ldb, practiceDetails).then((values) => {
          dayCW.allCardWordGraphs.add(wordInfo.graph);
          if (grade > GRADE.UNKNOWN) {
            dayCW.knownCardWordGraphs.add(wordInfo.graph);
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
          utils.baseUrl + "api/v1/enrich/translate", // FIXME: hardcoded nastiness
          JSON.stringify({ data: message.value }),
          utils.DEFAULT_RETRIES,
        )
        .then((translation) => {
          sendResponse({ source: message.source, type: message.type, value: translation });
        });
    });
  } else if (message.type === "enrichText") {
    loadDb(console.debug, message).then(() => {
      utils
        .fetchPlus(
          utils.baseUrl + "api/v1/enrich/enrich_json",
          JSON.stringify({ data: message.value }),
          utils.DEFAULT_RETRIES,
        )
        .then((parse) => {
          sendResponse({
            source: message.source,
            type: message.type,
            value: [parse, message.value],
          });
        });
    });
  } else if (message.type === "langPair") {
    loadDb(console.debug, message).then(() => {
      sendResponse({ source: message.source, type: message.type, value: utils.langPair });
    });
  } else if (message.type === "getFromSettingsDB") {
    getValue(message.value).then((value) => {
      sendResponse({ source: message.source, type: message.type, value: value });
    });
  } else if (message.type === "getUsername") {
    getUsername().then((username) => {
      sendResponse({ source: message.source, type: message.type, value: username });
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
  } else {
    console.warn("An unknown message type was submitted!", message);
  }
  return true;
});
