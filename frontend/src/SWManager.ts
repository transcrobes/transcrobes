import { RxDatabase } from "rxdb/dist/types/core";
import dayjs from "dayjs";

import { getDb, unloadDatabaseFromMemory } from "./database/Database";
import {
  setAccessToken,
  setRefreshToken,
  setUsername,
  EVENT_QUEUE_PROCESS_FREQ,
  PUSH_FILES_PROCESS_FREQ,
  fetchPlus,
  baseUrl,
  DEFAULT_RETRIES,
} from "./lib/lib";
import * as data from "./lib/data";
import { DayCardWords, DefinitionType, EventData } from "./lib/types";
import { getAccess, getRefresh, getUsername } from "./lib/JWTAuthProvider";
import { GRADE, TranscrobesCollections, TranscrobesDatabase } from "./database/Schema";

// FIXME: move to redux!!! or something less nasty!!!
let dayCardWords: DayCardWords | null;

let db: RxDatabase<TranscrobesCollections> | null;

let url: URL;
// FIXME: find some way to be able to stop the timer if required/desired
let eventQueueTimer: null | ReturnType<typeof setTimeout> = null;
let pushFileTimer: null | ReturnType<typeof setTimeout> = null;

export function postIt(event: ExtendableMessageEvent, newMessage: EventData): void {
  if (event.ports && event.ports[0]) {
    // This should be the workbox.messageSW, maybe
    event.ports[0].postMessage(newMessage);
  } else if (event.source) {
    // This should be the proxy, maybe
    event.source.postMessage(newMessage, []);
  } else {
    console.warn("Unable to find a channel to reply to", event, newMessage);
  }
}

async function loadDb(
  message: EventData,
  sw: ServiceWorkerGlobalScope,
  event?: ExtendableMessageEvent,
): Promise<[TranscrobesDatabase, EventData]> {
  if (db) {
    if (event) {
      postIt(event, { source: message.source, type: message.type, value: "loadDb success" });
    }
    return Promise.resolve([db, message]);
  }
  console.debug("Setting up the db in the service worker");

  if (eventQueueTimer) {
    clearInterval(eventQueueTimer);
  }
  if (pushFileTimer) {
    clearInterval(pushFileTimer);
  }

  setAccessToken(
    (await getAccess()) ||
      (() => {
        throw new Error("Unable to get access credentials");
      })(),
  );
  setRefreshToken(
    (await getRefresh()) ||
      (() => {
        throw new Error("Unable to get refresh credentials");
      })(),
  );
  setUsername(
    (await getUsername()) ||
      (() => {
        throw new Error("Unable to get username");
      })(),
  );

  const progressCallback = (progressMessage: string, isFinished: boolean) => {
    const progress = { message: progressMessage, isFinished };
    if (event) {
      postIt(event, {
        source: message.source,
        type: message.type + "-progress",
        value: progress,
      });
    }
  };
  return getDb({ url: url }, progressCallback).then((dbObj) => {
    db = dbObj;
    if (!sw.tcb) sw.tcb = new Promise<TranscrobesDatabase>((resolve, _reject) => resolve(dbObj));
    if (!eventQueueTimer && db) {
      eventQueueTimer = setInterval(
        () => data.sendUserEvents(dbObj, url),
        EVENT_QUEUE_PROCESS_FREQ,
      );
    }
    if (!pushFileTimer) {
      pushFileTimer = setInterval(() => data.pushFiles(url), PUSH_FILES_PROCESS_FREQ);
    }
    if (event) {
      postIt(event, { source: message.source, type: message.type, value: "loadDb success" });
    }
    return Promise.resolve([db, message]);
  });
}

function getLocalCardWords(message: EventData, sw: ServiceWorkerGlobalScope) {
  if (dayCardWords) {
    return Promise.resolve(dayCardWords);
  } else {
    return loadDb(message, sw).then(([ldb, _msg]) => {
      return data.getCardWords(ldb).then((val) => {
        dayCardWords = val;
        return Promise.resolve(dayCardWords);
      });
    });
  }
}

function addToLocalKnown(
  message: EventData,
  wordInfo: DefinitionType,
  grade: GRADE,
  sw: ServiceWorkerGlobalScope,
): void {
  getLocalCardWords(message, sw).then((dayCW) => {
    dayCW.allCardWordGraphs.add(wordInfo.graph);
    if (grade > GRADE.UNKNOWN) {
      // console.debug("Adding to known words", wordInfo);
      dayCW.knownCardWordGraphs.add(wordInfo.graph);
      dayCW.knownWordIdsCounter[wordInfo.id] = dayCW.knownWordIdsCounter[wordInfo.id]
        ? dayCW.knownWordIdsCounter[wordInfo.id] + 1
        : 1;
    }
    // else {
    //   console.debug("NOT adding to known words", wordInfo);
    // }
  });
}

export async function resetDBConnections(): Promise<void> {
  db = null;
  dayCardWords = null;
  if (eventQueueTimer) {
    clearInterval(eventQueueTimer);
  }
  if (pushFileTimer) {
    clearInterval(pushFileTimer);
  }
  await unloadDatabaseFromMemory();
}

export function manageEvent(sw: ServiceWorkerGlobalScope, event: ExtendableMessageEvent): void {
  if (!url) {
    url = new URL(sw.location.href);
  }

  if (!event.data || !event.data.type) {
    console.debug("Received an event without a message", event);
    return;
  }
  const message = event.data as EventData;

  switch (message.type) {
    case "syncDB":
      loadDb(message, sw, event);
      break;
    case "heartbeat":
      postIt(event, { source: message.source, type: message.type, value: dayjs().format() });
      break;
    case "getCardWords":
      getLocalCardWords(message, sw).then((dayCW) => {
        postIt(event, {
          source: message.source,
          type: message.type,
          // convert to arrays or Set()s get silently purged in chrome extensions, so
          // need to mirror here for the same return types... Because JS is sooooooo awesome!
          // value: [Array.from(values[0]), Array.from(values[1]), values[2]]
          value: {
            allCardWordGraphs: Array.from(dayCW.allCardWordGraphs),
            knownCardWordGraphs: Array.from(dayCW.knownCardWordGraphs),
            knownWordIdsCounter: dayCW.knownWordIdsCounter,
          },
        });
      });
      break;
    case "sentenceTranslation":
      loadDb(message, sw).then(() => {
        fetchPlus(
          baseUrl + "api/v1/enrich/translate", // FIXME: hardcoded nastiness
          JSON.stringify({ data: message.value }),
          DEFAULT_RETRIES,
        ).then((translation) => {
          postIt(event, { source: message.source, type: message.type, value: translation });
        });
      });
      break;
    // FIXME: is this better? or is the other safer and better with negligible performance hit?
    // case "practiceCardsForWord":
    //   loadDb(message, sw).then(([ldb, msg]) => {
    //     data.practiceCardsForWord(ldb, message.value).then((values) => {
    //       addToLocalKnown(msg, message.value.wordInfo, message.value.grade, sw);
    //       postIt(event, { source: msg.source, type: msg.type, value: "Cards Practiced" });
    //     });
    //   });
    //   break;

    // The following devalidate the dayCardWords "cache", so setting to null
    case "practiceCardsForWord":
    case "addOrUpdateCardsForWord":
    case "updateCard":
    case "createCards":
      dayCardWords = null; // simpler to set to null rather than try and merge lots
    // eslint-disable-next-line no-fallthrough
    case "getCharacterDetails":
    case "getAllFromDB":
    case "getByIds":
    case "getWordDetails":
    case "practiceCard":
    case "getWordFromDBs":
    case "getKnownWordIds":
    case "saveSurvey":
    case "submitLookupEvents":
    case "getUserListWords":
    case "getDefaultWordLists":
    case "getWordListWordIds":
    case "setContentConfigToStore":
    case "getContentConfigFromStore":
    case "getVocabReviews":
    case "getSRSReviews":
    case "submitUserEvents":
    case "updateRecentSentences":
    case "addRecentSentences":
    case "getRecentSentences":
    case "getFirstSuccessStatsForList":
    case "getFirstSuccessStatsForImport":
    case "submitContentEnrichRequest":
      loadDb(message, sw).then(([ldb, msg]) => {
        // @ts-ignore FIXME: can I properly type this somehow and it actually be clean/useful?
        data[message.type](ldb, message.value).then((result) => {
          postIt(event, { source: msg.source, type: msg.type, value: result });
        });
      });
      break;

    default:
      console.warn("Service Worker received a message event that I had no manager for", event);
      break;
  }
}
