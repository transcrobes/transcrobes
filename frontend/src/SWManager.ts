import { RxDatabase } from "rxdb/dist/types/core";

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
import {
  CardType,
  CharacterType,
  DayCardWords,
  DefinitionType,
  EventData,
  WordDetailsType,
} from "./lib/types";
import { getAccess, getRefresh, getUsername } from "./lib/JWTAuthProvider";
import dayjs from "dayjs";
import { GRADE, TranscrobesCollections, TranscrobesDatabase } from "./database/Schema";
import { clone } from "rxdb";

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
      postIt(event, { source: message.source, type: message.type + "-progress", value: progress });
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
  const message = event.data;
  if (message.type === "syncDB") {
    loadDb(message, sw, event);
  } else if (message.type === "heartbeat") {
    postIt(event, { source: message.source, type: message.type, value: dayjs().format() });
  } else if (message.type === "getWordFromDBs") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getWordFromDBs(ldb, msg.value).then((values) => {
        const daVal = values ? values.toJSON() : null;
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: daVal,
        });
      });
    });
  } else if (message.type === "getKnownWordIds") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getKnownWordIds(ldb).then((values) => {
        postIt(event, { source: msg.source, type: msg.type, value: values });
      });
    });
  } else if (message.type === "getCardWords") {
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
  } else if (message.type === "submitLookupEvents") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data
        .submitLookupEvents(ldb, msg.value.lookupEvents, msg.value.userStatsMode, msg.source)
        .then(() => {
          postIt(event, {
            source: msg.source,
            type: msg.type,
            value: "Lookup Events submitted",
          });
        });
    });
  } else if (message.type === "getUserListWords") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getUserListWords(ldb).then((values) => {
        // console.debug("getUserListWords results in sw.js", msg, values);
        postIt(event, { source: msg.source, type: msg.type, value: values });
      });
    });
  } else if (message.type === "getDefaultWordLists") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getDefaultWordLists(ldb).then((values) => {
        // console.debug("getDefaultWordLists results in sw.js", msg, values);
        postIt(event, { source: msg.source, type: msg.type, value: values });
      });
    });
  } else if (message.type === "getWordListWordIds") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getWordListWordIds(ldb, message.value).then((values) => {
        // console.debug("getWordListWordIds results in sw.js", msg, values);
        postIt(event, { source: msg.source, type: msg.type, value: values });
      });
    });
  } else if (message.type === "createCards") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.createCards(ldb, msg.value).then((values) => {
        // console.debug("createCards results in sw.js", msg, values);
        dayCardWords = null; // simpler to set to null rather than try and merge lots
        const success = values.success.map((x) => x.toJSON());
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: { error: values.error, success },
        });
      });
    });
  } else if (message.type === "setContentConfigToStore") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.setContentConfigToStore(ldb, msg.value).then((values) => {
        // console.debug("setContentConfigToStore results in sw.js", msg, values);
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: "Content config saved",
        });
      });
    });
  } else if (message.type === "getCharacterDetails") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getCharacterDetails(ldb, msg.value).then((values) => {
        // console.debug("getCharacterDetails results in sw.js", msg, values);
        let chars: (CharacterType | null)[] = [];
        if (msg.value && msg.value.length > 0) {
          chars = msg.value.map((w: string) => {
            const word = values.get(w);
            if (word) return clone(word.toJSON());
            else return null;
          });
        }
        postIt(event, {
          source: message.source,
          type: message.type,
          value: chars,
        });
      });
    });
  } else if (message.type === "getByIds") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getByIds(ldb, msg.value.collection, msg.value.ids).then((values) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: [...values.values()].map((x) => x.toJSON()),
        });
      });
    });
  } else if (message.type === "getAllFromDB") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getAllFromDB(ldb, msg.value.collection, msg.value.queryObj).then((values) => {
        // console.debug("getAllFromDB results in sw.js", msg, values);
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: values.map((x) => x.toJSON()),
        });
      });
    });
  } else if (message.type === "getContentConfigFromStore") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getContentConfigFromStore(ldb, msg.value).then((values) => {
        // console.debug("getContentConfigFromStore results in sw.js", msg, values);
        postIt(event, { source: msg.source, type: msg.type, value: values });
      });
    });
  } else if (message.type === "getVocabReviews") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getVocabReviews(ldb, msg.value).then((values) => {
        // console.debug("getVocabReviews results in sw.js", msg, values);
        postIt(event, { source: msg.source, type: msg.type, value: values });
      });
    });
  } else if (message.type === "getSRSReviews") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getSRSReviews(ldb, msg.value).then((values) => {
        // console.debug("getSRSReviews results in sw.js", msg, values);
        // todaysWordIds,  // Set of words reviewed today already: string ids
        // allNonReviewedWordsMap,  // Map of words in selected lists not already reviewed today: RxDocument
        // existingCards,  // Map of all cards reviewed at least once: RxDocument
        // existingWords,  // Map of all words which have had at least one card reviewed at least once: RxDocument
        // potentialWords,  // Array of words that can be "new" words today: RxDocument
        const allNonReviewedWordsMap = new Map<string, DefinitionType>();
        for (const [k, v] of values.allNonReviewedWordsMap) {
          allNonReviewedWordsMap.set(k, clone(v.toJSON()));
        }
        const existingCards = new Map<string, CardType>();
        for (const [k, v] of values.existingCards) {
          existingCards.set(k, v.toJSON());
        }
        const existingWords = new Map<string, DefinitionType>();
        for (const [k, v] of values.existingWords) {
          existingWords.set(k, clone(v.toJSON()));
        }
        const potentialWords: DefinitionType[] = [];
        for (const pw of values.potentialWords) {
          potentialWords.push(clone(pw.toJSON()));
        }
        const allPotentialCharacters = new Map<string, CharacterType>();
        for (const [k, v] of values.allPotentialCharacters) {
          allPotentialCharacters.set(k, v.toJSON());
        }
        const sanitised = {
          todaysWordIds: values.todaysWordIds,
          allNonReviewedWordsMap,
          existingCards,
          existingWords,
          potentialWords,
          allPotentialCharacters,
        };
        postIt(event, { source: msg.source, type: msg.type, value: sanitised });
      });
    });
  } else if (message.type === "submitUserEvents") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.submitUserEvents(ldb, msg.value).then(() => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: "User Events submitted",
        });
      });
    });
  } else if (message.type === "practiceCard") {
    const { currentCard, grade, badReviewWaitSecs } = message.value;
    loadDb(message, sw).then(([ldb, msg]) => {
      data.practiceCard(ldb, currentCard, grade, badReviewWaitSecs).then((values) => {
        // console.debug("practiceCard in sw.js", msg, values);
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: values ? values.toJSON() : null,
        });
      });
    });
  } else if (message.type === "practiceCardsForWord") {
    const practiceDetails = message.value;
    const { wordInfo, grade } = practiceDetails;
    loadDb(message, sw).then(([ldb, msg]) => {
      data.practiceCardsForWord(ldb, practiceDetails).then((values) => {
        addToLocalKnown(msg, wordInfo, grade, sw);
        // console.debug("Practiced in sw.js", msg, values);
        postIt(event, { source: msg.source, type: msg.type, value: "Cards Practiced" });
      });
    });
  } else if (message.type === "addOrUpdateCards") {
    const { wordId, grade } = message.value;
    loadDb(message, sw).then(([ldb, msg]) => {
      data.addOrUpdateCardsForWord(ldb, wordId, grade).then((cards) => {
        // console.debug("addOrUpdateCards in sw.js", cards);
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: cards.map((x) => x.toJSON()),
        });
      });
    });
  } else if (message.type === "getWordDetails") {
    const { graph } = message.value;
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getWordDetails(ldb, graph).then((details) => {
        // console.debug("getWordDetails result in sw.js", details);
        let chars: (CharacterType | null)[] = [];
        if (details.word) {
          chars = details.word.graph.split("").map((w) => {
            const word = details.characters.get(w);
            if (word) return clone(word.toJSON());
            else return null;
          });
        }
        const safe: WordDetailsType = {
          word: details.word ? clone(details.word.toJSON()) : null,
          cards: [...details.cards.values()].map((x) => clone(x.toJSON())),
          characters: chars,
          recentPosSentences: details.recentPosSentences,
          wordModelStats: details.wordModelStats ? clone(details.wordModelStats.toJSON()) : null,
        };
        postIt(event, { source: msg.source, type: msg.type, value: safe });
      });
    });
  } else if (message.type === "saveSurvey") {
    const { dataValue, surveyId } = message.value;
    loadDb(message, sw).then(([ldb, msg]) => {
      data.saveSurvey(ldb, surveyId, dataValue).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else if (message.type === "enrich") {
    const { contentId } = message.value;
    loadDb(message, sw).then(([ldb, msg]) => {
      data.enrich(ldb, contentId).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else if (message.type === "sentenceTranslation") {
    loadDb(message, sw).then(() => {
      fetchPlus(
        baseUrl + "api/v1/enrich/translate", // FIXME: hardcoded nastiness
        JSON.stringify({ data: message.value }),
        DEFAULT_RETRIES,
      ).then((translation) => {
        postIt(event, { source: message.source, type: message.type, value: translation });
      });
    });
  } else if (message.type === "updateRecentSentences") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.updateRecentSentences(ldb, message.value).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else if (message.type === "addRecentSentences") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.addRecentSentences(ldb, message.value).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else if (message.type === "getRecentSentences") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getRecentSentences(ldb, message.value).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else if (message.type === "getFirstSuccessStatsForList") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getFirstSuccessStatsForList(ldb, message.value).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else if (message.type === "getFirstSuccessStatsForImport") {
    loadDb(message, sw).then(([ldb, msg]) => {
      data.getFirstSuccessStatsForImport(ldb, message.value).then((result) => {
        postIt(event, {
          source: msg.source,
          type: msg.type,
          value: result,
        });
      });
    });
  } else {
    console.warn("Service Worker received a message event that I had no manager for", event);
  }
}
