import dayjs from "dayjs";
import draftToHtml from "draftjs-to-html";
import _ from "lodash";
import LZString from "lz-string";
import { clone, isRxDocument } from "rxdb";
import { MangoQuery, RxStorageWriteError } from "rxdb/dist/types/types";
import { $enum } from "ts-enum-util";
import { v4 as uuidv4 } from "uuid";
import { getDatabaseName, replStates } from "../database/Database";
import {
  ActivityQueueDocument,
  CARD_TYPES,
  CardDocument,
  CharacterDocument,
  DefinitionDocument,
  RecentSentencesDocument,
  TranscrobesCollectionsKeys,
  TranscrobesDatabase,
  TranscrobesDocumentTypes,
  getCardId,
  getCardTypeAsInt,
  getWordId,
} from "../database/Schema";
import { DBParameters } from "../ra-data-rxdb";
import { IDBFileStorage, getFileStorage } from "./IDBFileStorage";
import {
  UUID,
  cleanSentence,
  configIsUsable,
  getKnownChars,
  getSuccessWords,
  pythonCounter,
  recentSentencesFromLZ,
} from "./funclib";
import { cleanAnalysis, cleanedSound, fetchPlus, fetchPlusResponse, simpOnly, sortByWcpm } from "./libMethods";
import { practice } from "./review";
import {
  ACTIVITY_TIMEOUT,
  ActionEvent,
  CalculatedContentStats,
  CalculatedContentValueStats,
  CardType,
  CharacterType,
  ClassRegistration,
  ContentConfigType,
  DailyReviewables,
  DayModelStatsType,
  DefaultExportDetails,
  DefinitionType,
  DictionaryCounter,
  ExportDetails,
  FirstSuccess,
  GraderConfig,
  Import,
  ImportAnalysis,
  ImportFirstSuccessStats,
  InputLanguage,
  ListFirstSuccessStats,
  MIN_ACTIVITY_LENGTH,
  PROCESSING,
  PROCESS_TYPE,
  Participants,
  PracticeDetailsType,
  PythonCounter,
  RecentSentencesStoredType,
  RecentSentencesType,
  RepetrobesActivityConfigType,
  SelectableListElementType,
  SerialisableDayCardWords,
  SerialisableStringSet,
  SessionType,
  ShortChar,
  ShortWord,
  StudentRegistrationType,
  TeacherRegistrationType,
  UserActivity,
  UserActivityType,
  UserDefinitionType,
  UserListWordType,
  WordDetailsRxType,
  WordDetailsType,
  WordListNamesType,
  WordOrdering,
} from "./types";

const IMPORT_FILE_STORAGE = "import_file_storage";

export async function createRegistrationRequest(db: TranscrobesDatabase, fixme: string[]): Promise<[]> {
  throw new Error("Not Implemented");
}

export function getNamedFileStorage(parameters: DBParameters): Promise<IDBFileStorage> {
  if (!parameters.username) {
    throw new Error("Unable to find the current user");
  }
  return getFileStorage(`${getDatabaseName(parameters)}_${IMPORT_FILE_STORAGE}`);
}

export async function createEpubImportFromURL(db: TranscrobesDatabase, url: string, description: string) {
  const id = uuidv4();
  const title = url.split("/").pop() || "unknown.epub";
  const localFileName = `${id}_${title}`;
  const imp: Import = {
    id,
    title,
    description,
    sourceUrl: url,
    importFile: localFileName,
    processing: PROCESSING.REQUESTED,
    processType: PROCESS_TYPE.VOCABULARY_ONLY,
    shared: false,
  };
  console.log("Wanting to insert import", imp);
  await db.imports.insert(imp);
  return localFileName;
}

export async function pushFiles(url: URL, username: string): Promise<{ status?: "success" }> {
  const apiEndPoint = new URL("/api/v1/enrich/import_file", url.origin).href;
  const fileStore = await getNamedFileStorage({ url, username });
  const cacheFiles = await fileStore.list();
  for (const f in cacheFiles) {
    const upload = await fileStore.get(cacheFiles[f]);
    const fd = new FormData();
    fd.append("afile", upload);
    fd.append("filename", cacheFiles[f]);
    console.log("Sending file", cacheFiles[f]);
    const result = await fetchPlusResponse(apiEndPoint, fd);
    if (result.ok) {
      console.log("Sending file success", cacheFiles[f]);
      await fileStore.remove(cacheFiles[f]);
    } else {
      console.error(result);

      throw new Error("There was an error pushing an import file");
    }
  }
  return { status: "success" };
}

export async function enqueueRegistrations(
  db: TranscrobesDatabase,
  { registrations }: { registrations: ClassRegistration[] },
): Promise<boolean> {
  let uuid = UUID();
  while (await db.requestqueue.findOne(uuid).exec()) {
    console.debug(`looks like event ${uuid} already exists, looking for another`);
    uuid = UUID();
  }
  await db.requestqueue.insert({
    id: uuid.toString(),
    type: "registration",
    endpoint: "/api/v1/users/register_classes",
    requestString: JSON.stringify(registrations),
  });
  return true;
}

export async function refreshSession(
  db: TranscrobesDatabase,
  { id, timestamp }: { id: string; timestamp: number },
): Promise<{ status: string }> {
  if (db && id) {
    await db.sessions.incrementalUpsert({ id, timestamp });
    return { status: "success" };
  } else {
    return { status: "uninitialised" };
  }
}

export async function processRequestQueue(
  db: TranscrobesDatabase,
  url: URL,
  maxRequests = 500,
): Promise<{ status: string }> {
  if (!db) {
    return { status: "uninitialised" };
  }

  const allRequests = {};
  const allRequestIds = {};
  const allEntries = await db.requestqueue.find({ limit: maxRequests }).exec();

  for (const request of allEntries) {
    const requestObj = JSON.parse(request.requestString);
    if (!allRequests[request.endpoint]) {
      allRequests[request.endpoint] = [];
      allRequestIds[request.endpoint] = [];
    }
    for (const arequest of Array.isArray(requestObj) ? requestObj : [requestObj]) {
      console.log("arequest", arequest);
      allRequests[request.endpoint].push(arequest);
      allRequestIds[request.endpoint].push(request.id.toString());
    }
  }

  if (!Object.keys(allEntries).length) {
    return { status: "empty_queue" };
  }
  for (const [endpoint, requests] of Object.entries(allRequests)) {
    const apiEndPoint = new URL(endpoint, url.origin).href;
    console.log("sending requests", endpoint, apiEndPoint, requests);
    const data = await fetchPlus(apiEndPoint, JSON.stringify(requests));
    if (!data || !("successes" in data) || !("failures" in data)) {
      throw new Error("user_event update failed due to return status incorrect!");
    } else {
      // FIXME: should we do something with the failures? Maybe add to a visible log?
      if (data.failures.length) {
        console.error("Failed to send requests", endpoint, requests, data.failures);
      }
      // remove from queue, but no need to wait
      db.requestqueue.bulkRemove(allRequestIds[endpoint]);
    }
  }
  return { status: "success" };
}

export async function sendActivities(
  db: TranscrobesDatabase,
  url: URL,
  maxSendEvents = 500,
): Promise<{ status: string }> {
  if (!db) {
    return { status: "uninitialised" };
  }

  const eventsToDelete: string[] = [];
  const rawSessionEvents: {
    [key: string]: ActivityQueueDocument[];
  } = {};
  let activities: UserActivity[] = [];

  const allEntries = await db.activityqueue.find({ limit: maxSendEvents }).sort("timestamp").exec();
  const allEvents = new Map<string, ActivityQueueDocument>();

  const allSessionDocuments = await db.sessions.find().exec();
  const liveSessions = new Map<string, SessionType>();
  const deadSessions = new Map<string, SessionType>();
  const now = Date.now();
  for (const session of allSessionDocuments) {
    if (now - parseInt(session.timestamp.toString()) > ACTIVITY_TIMEOUT) {
      deadSessions.set(session.id, session);
    } else {
      liveSessions.set(session.id, session);
    }
  }

  if (!allEntries.length) {
    // console.debug("Queue empty");
    return { status: "empty_queue" };
  }
  for (let i = 0; i < allEntries.length; i++) {
    const event = allEntries[i];
    allEvents.set(event.id, event);
    const eventSessionId = event.asessionId;

    if (!rawSessionEvents[eventSessionId]) {
      rawSessionEvents[eventSessionId] = [];
    }
    const sessionEventsQueue = rawSessionEvents[eventSessionId];
    const lastEvent = sessionEventsQueue[sessionEventsQueue.length - 1];
    if (
      (event.activityType === "end" && sessionEventsQueue.length === 0) ||
      (event.activityType === "start" && lastEvent?.activityType === "start" && lastEvent.url === event.url)
    ) {
      console.debug("Ignoring event initial end or start:start", lastEvent?.toJSON(), event.toJSON());
      eventsToDelete.push(event.id);
      continue;
    } else if (event.activityType === "end" && lastEvent.activityType === "end" && lastEvent.url === event.url) {
      console.debug("Ignoring event end:end", lastEvent?.toJSON(), event.toJSON());
      sessionEventsQueue.pop();
    }
    sessionEventsQueue.push(event);
  }

  for (const session of Object.keys(rawSessionEvents)) {
    const sessionEventsQueue = rawSessionEvents[session];
    let curActivity: UserActivity | null = null;
    let curActivityEvents: ActivityQueueDocument[] = [];

    for (let i = 0; i < sessionEventsQueue.length; i++) {
      const event = sessionEventsQueue[i];
      const last = sessionEventsQueue[i - 1];
      if (curActivity && event.url === curActivity.url) {
        curActivityEvents.push(event);
        curActivity.end = event.timestamp;
        if (
          event.activityType === "end" ||
          (i === sessionEventsQueue.length - 1 &&
            (deadSessions.has(event.asessionId) || !liveSessions.has(event.asessionId)))
        ) {
          if (curActivity.end > curActivity.start) activities.push(curActivity);
          for (const anevent of curActivityEvents) {
            eventsToDelete.push(anevent.id);
          }
          curActivityEvents = [];
          curActivity = null;
        }
      } else {
        if (curActivity) {
          const ts = (deadSessions.get(last.asessionId) || liveSessions.get(last.asessionId))?.timestamp;
          if (ts) curActivity.end = ts;
          if (curActivity.end > curActivity.start) activities.push(curActivity);
          for (const anevent of curActivityEvents) {
            eventsToDelete.push(anevent.id);
          }
          curActivityEvents = [];
        }
        curActivityEvents.push(event);
        curActivity = {
          end: event.timestamp,
          start: event.timestamp,
          type: "activity",
          url: event.url,
        };
      }
    }
  }
  if (allEntries.length < maxSendEvents) {
    // we have processed all the entries, we can remove all the old sessions
    await db.sessions.bulkRemove([...deadSessions.keys()]);
  }

  activities = activities.filter((act) => {
    console.log("Send activity", act.end - act.start > MIN_ACTIVITY_LENGTH, act.end - act.start, JSON.stringify(act));
    return act.end - act.start > MIN_ACTIVITY_LENGTH;
  });

  if (eventsToDelete.length === 0) {
    // console.debug("Queue length:", allEntries.length);
  } else {
    // console.debug("Deleting", eventsToDelete);
    db.activityqueue.bulkRemove(eventsToDelete);
  }

  if (activities.length > 0) {
    // FIXME: externalise URL
    const apiEndPoint = new URL("/api/v1/data/user_events", url.origin).href;
    const data = await fetchPlus(apiEndPoint, JSON.stringify(activities));

    if (!data || !data["status"] || !(data["status"] === "success")) {
      throw new Error("user_event update failed due to return status incorrect!");
    } else {
      // remove from queue, but no need to wait
      await db.activityqueue.bulkRemove(eventsToDelete);
    }
  } else if (eventsToDelete.length > 0) {
    await db.activityqueue.bulkRemove(eventsToDelete);
  }
  return { status: "success" };
}

export async function sendUserEvents(
  db: TranscrobesDatabase,
  url: URL,
  maxSendEvents = 500,
): Promise<{ status: string }> {
  if (!db) {
    return { status: "uninitialised" };
  }
  const allEvents: any[] = []; // FIXME: this should be a "user event" type
  const allEventIds: string[] = [];

  const allEntries = await db.event_queue.find({ limit: maxSendEvents }).exec();

  for (const event of allEntries) {
    allEventIds.push(event.id.toString());
    const eventObj = JSON.parse(event.eventString);
    for (const anevent of Array.isArray(eventObj) ? eventObj : [eventObj]) {
      allEvents.push(anevent);
    }
  }

  if (!allEntries.length) {
    return { status: "empty_queue" };
  }
  // FIXME: externalise URL
  const apiEndPoint = new URL("/api/v1/data/user_events", url.origin).href;
  const data = await fetchPlus(apiEndPoint, JSON.stringify(allEvents));
  if (!data || !data["status"] || !(data["status"] === "success")) {
    throw new Error("user_event update failed due to return status incorrect!");
  } else {
    // remove from queue, but no need to wait
    db.event_queue.bulkRemove(allEventIds);
  }
  return { status: "success" };
}

export async function getAllFromDB(
  db: TranscrobesDatabase,
  // FIXME: WARNING! Using `TranscrobesCollectionsKeys` instead of `any` makes tsc take MINUTES!
  // { collection, queryObj }: { collection: TranscrobesCollectionsKeys; queryObj?: MangoQuery<TranscrobesDocumentTypes> },
  { collection, queryObj }: { collection: any; queryObj?: MangoQuery<TranscrobesDocumentTypes> },
): // TODO: see whether this could be properly typed
Promise<any[]> {
  const values = await db[collection].find(queryObj).exec();
  return values.map((x) => x.toJSON());
}

export async function getByIds(
  db: TranscrobesDatabase,
  { collection, ids }: { collection: TranscrobesCollectionsKeys; ids: string[] },
): // TODO: see whether this could be properly typed
Promise<any[]> {
  if (ids.length === 0) return [];
  const values = await db[collection].findByIds(ids).exec();
  return [...values.values()].map((def) => def.toJSON());
}

export async function getKnownWordIds(db: TranscrobesDatabase): Promise<Set<string>> {
  const knownWordIds = new Set<string>(
    (
      await db.cards
        .find({
          selector: { $or: [{ known: { $eq: true } }, { firstSuccessDate: { $gt: 0 } }] },
        })
        .exec()
    ).flatMap((x) => x.wordId()),
  );

  return knownWordIds;
}

async function getKnownCards(db: TranscrobesDatabase): Promise<Map<string, CardType>> {
  const knownCards = new Map<string, CardType>();
  const cards = await db.cards
    .find({
      selector: { firstSuccessDate: { $gt: 0 } },
    })
    .exec();
  for (const card of cards) {
    const wordId = card.wordId();
    const first = knownCards.get(wordId);
    if (!first || first.firstSuccessDate > card.firstSuccessDate) {
      knownCards.set(wordId, card.toJSON());
    }
  }
  return knownCards;
}

async function getGraphs(db: TranscrobesDatabase, wordIds: string[]): Promise<Map<string, string>> {
  const graphs = new Map<string, string>();
  const defs = [...(await db.definitions.findByIds(wordIds).exec()).values()];
  for (const def of defs) {
    graphs.set(def.id, def.graph);
  }
  return graphs;
}

export async function getImportUtilityStatsForList(
  db: TranscrobesDatabase,
  { importId, userlistId, fromLang }: { importId: string; userlistId: string; fromLang: InputLanguage },
  cardWords: SerialisableDayCardWords,
): Promise<CalculatedContentValueStats | null> {
  const theImport = (await db.imports.findByIds([importId]).exec()).get(importId);
  if (!theImport?.analysis || theImport.analysis.length === 0) return null;
  const analysis: ImportAnalysis = JSON.parse(theImport.analysis);
  const wordlist = (await db.wordlists.findByIds([userlistId]).exec()).get(userlistId)?.wordIds;
  const defs = new Set<string>();
  for (const def of (await db.definitions.findByIds(wordlist || []).exec()).values()) {
    defs.add(def.graph);
  }
  const buckets = cleanAnalysis(analysis, fromLang);

  const foundWords: PythonCounter = {};
  const notFoundWords: PythonCounter = {};
  const knownFoundWords: PythonCounter = {};
  const knownNotFoundWords: PythonCounter = {};

  let unknownFoundWordsTotalTokens: number = 0;
  let unknownNotFoundWordsTotalTokens: number = 0;
  let knownFoundWordsTotalTokens: number = 0;
  let knownNotFoundWordsTotalTokens: number = 0;

  for (const [nbOccurences, words] of Object.entries(buckets)) {
    for (const word of words) {
      if (defs.has(word)) {
        if (word in cardWords.knownCardWordGraphs) {
          knownFoundWords[word] = parseInt(nbOccurences);
          knownFoundWordsTotalTokens += parseInt(nbOccurences);
        } else {
          foundWords[word] = parseInt(nbOccurences);
          unknownFoundWordsTotalTokens += parseInt(nbOccurences);
        }
      } else {
        if (word in cardWords.knownCardWordGraphs) {
          knownNotFoundWords[word] = parseInt(nbOccurences);
          knownNotFoundWordsTotalTokens += parseInt(nbOccurences);
        } else {
          notFoundWords[word] = parseInt(nbOccurences);
          unknownNotFoundWordsTotalTokens += parseInt(nbOccurences);
        }
      }
    }
  }
  return {
    unknownFoundWordsTotalTypes: Object.keys(foundWords || {}).length,
    unknownNotFoundWordsTotalTypes: Object.keys(notFoundWords || {}).length,
    knownFoundWordsTotalTypes: Object.keys(knownFoundWords || {}).length,
    knownNotFoundWordsTotalTypes: Object.keys(knownNotFoundWords || {}).length,

    unknownFoundWordsTotalTokens,
    unknownNotFoundWordsTotalTokens,
    knownFoundWordsTotalTokens,
    knownNotFoundWordsTotalTokens,
  };
}

export async function getContentAccuracyStatsForImport(
  db: TranscrobesDatabase,
  {
    importId,
    analysisString,
    allWordsInput,
    fromLang,
  }: { importId?: string; analysisString?: string; allWordsInput?: PythonCounter; fromLang: InputLanguage },
  cardWords: SerialisableDayCardWords,
) {
  const defs = new Map<string, DefinitionDocument>();
  for (const def of await db.definitions.find().exec()) {
    defs.set(def.graph, def);
  }

  const allWords: DictionaryCounter = {};
  if (allWordsInput) {
    for (const [word, nbOccurrences] of Object.entries(allWordsInput)) {
      allWords[word] = [defs.get(word)?.id || "", nbOccurrences];
    }
  } else {
    let analysis: ImportAnalysis;
    if (analysisString) {
      analysis = JSON.parse(analysisString);
    } else if (importId) {
      const theImport = (await db.imports.findByIds([importId]).exec()).get(importId);
      if (!theImport?.analysis || theImport.analysis.length === 0) return null;
      analysis = JSON.parse(theImport.analysis);
    } else {
      throw new Error("At least one of importId or analysisString must be provided");
    }
    const buckets = cleanAnalysis(analysis, fromLang);
    for (const [nbOccurrences, wordList] of Object.entries(buckets)) {
      for (const word of wordList) {
        allWords[word] = [defs.get(word)?.id || "", parseInt(nbOccurrences)];
      }
    }
  }
  const foundWords: PythonCounter = {};
  const notFoundWords: PythonCounter = {};
  const knownFoundWords: PythonCounter = {};
  const knownNotFoundWords: PythonCounter = {};
  for (const [word, [, nbOccurances]] of Object.entries(allWords)) {
    const def = defs.get(word);
    let found = false;
    if (def) {
      for (const prov of def.providerTranslations) {
        if (prov.provider !== "fbk" && prov.posTranslations.length > 0) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      foundWords[word] = nbOccurances;
      if (word in cardWords.knownCardWordGraphs) {
        knownFoundWords[word] = nbOccurances;
      }
    } else {
      notFoundWords[word] = nbOccurances;
      if (word in cardWords.knownCardWordGraphs) {
        knownNotFoundWords[word] = nbOccurances;
      }
    }
  }
  return { allWords, foundWords, notFoundWords, knownFoundWords, knownNotFoundWords };
}

export async function getContentStatsForImport(
  db: TranscrobesDatabase,
  { importId, analysisString, fromLang }: { importId?: string; analysisString?: string; fromLang: InputLanguage },
  cardWords: SerialisableDayCardWords,
): Promise<CalculatedContentStats | null> {
  let analysis: ImportAnalysis;
  if (analysisString) {
    analysis = JSON.parse(analysisString);
  } else if (importId) {
    const theImport = (await db.imports.findByIds([importId]).exec()).get(importId);
    if (!theImport?.analysis || theImport.analysis.length === 0) return null;
    analysis = JSON.parse(theImport.analysis);
  } else {
    throw new Error("At least one of importId or analysisString must be provided");
  }
  const buckets = cleanAnalysis(analysis, fromLang);
  const allWords: PythonCounter = {};
  let wordsTypes = 0;
  let words = 0;
  let allChars = "";

  for (const [nbOccurances, wordList] of Object.entries(buckets)) {
    for (const word of wordList) {
      allWords[word] = parseInt(nbOccurances);
    }
    words += parseInt(nbOccurances) * wordList.length;
    wordsTypes += wordList.length;
    allChars += wordList.join("").repeat(parseInt(nbOccurances));
  }
  const chars = allChars.length;
  const allCharCounts = pythonCounter(allChars);
  const charsTypes = Object.keys(allCharCounts).length;
  let knownCharsTypes = 0;
  let knownChars = 0;
  if (cardWords.knownCardWordChars) {
    for (const [char, count] of Object.entries(allCharCounts)) {
      if (Object.hasOwn(cardWords.knownCardWordChars, char)) {
        knownCharsTypes++;
        knownChars += count;
      }
    }
  }

  let knownWordsTypes = 0;
  let knownWords = 0;
  for (const [word, count] of Object.entries(allWords)) {
    if (Object.hasOwn(cardWords.knownCardWordGraphs, word)) {
      knownWordsTypes++;
      knownWords += count;
    }
  }
  const meanSentenceLength = _.mean(analysis.sentenceLengths);
  return {
    fromLang,
    chars,
    knownChars,
    charsTypes,
    knownCharsTypes,
    words,
    knownWords,
    wordsTypes,
    knownWordsTypes,
    meanSentenceLength,
  };
}

export async function getFirstSuccessStatsForImport(
  db: TranscrobesDatabase,
  { importId, analysisString, fromLang }: { importId?: string; analysisString?: string; fromLang: InputLanguage },
): Promise<ImportFirstSuccessStats | null> {
  let analysis: ImportAnalysis;
  if (analysisString) {
    analysis = JSON.parse(analysisString);
  } else if (importId) {
    const theImport = (await db.imports.findByIds([importId]).exec()).get(importId);
    // this is actually ok, if you have "deleted" the import but there is still a content
    //if (!theImport) throw new Error("Invalid, import not found");
    if (!theImport?.analysis || theImport.analysis.length === 0) return null;
    analysis = JSON.parse(theImport.analysis);
  } else {
    throw new Error("At least one of importId or analysisString must be provided");
  }
  const knownCards = await getKnownCards(db);
  const knownGraphs = await getGraphs(db, [...knownCards.keys()]);
  const knownChars = getKnownChars(knownCards, knownGraphs);

  const buckets = cleanAnalysis(analysis, fromLang);
  const allWords: [string, number][] = [];
  let nbUniqueWords = 0;
  let nbTotalWords = 0;
  let allChars = "";

  for (const [nbOccurances, wordList] of Object.entries(buckets)) {
    allWords.push(...wordList.map((word: string) => [word, parseInt(nbOccurances)] as [string, number]));
    nbTotalWords += parseInt(nbOccurances) * wordList.length;
    nbUniqueWords += wordList.length;
    allChars += wordList.join("").repeat(parseInt(nbOccurances));
  }
  const nbTotalCharacters = allChars.length;
  const uniqueListChars = new Set([...allChars]);
  const nbUniqueCharacters = uniqueListChars.size;
  const allWordsMap = new Map(allWords);
  const successWords = getSuccessWords(knownCards, knownGraphs, allWordsMap);
  const allCharCounts = pythonCounter(allChars);
  const successChars: FirstSuccess[] = [];
  for (const [char, firstSuccessDate] of knownChars.entries()) {
    if (allCharCounts[char] > 0) {
      successChars.push({
        firstSuccess: firstSuccessDate,
        nbOccurrences: allCharCounts[char],
      });
    }
  }
  successChars.sort((a, b) => a.firstSuccess - b.firstSuccess);
  successWords.sort((a, b) => a.firstSuccess - b.firstSuccess);

  const meanSentenceLength = _.mean(analysis.sentenceLengths);
  return {
    successChars,
    successWords,
    nbTotalCharacters,
    nbTotalWords,
    nbUniqueCharacters,
    nbUniqueWords,
    meanSentenceLength,
  };
}

export async function getWaitingRevisions(db: TranscrobesDatabase): Promise<CardType[]> {
  return (
    await db.cards
      .find({
        selector: {
          $and: [{ firstRevisionDate: { $gt: 0 } }, { dueDate: { $lt: dayjs().unix() } }, { known: { $ne: true } }],
        },
        sort: [{ dueDate: "asc" }],
      })
      .exec()
  ).map((c) => clone(c.toJSON()));
}

export async function getFirstSuccessStatsForList(
  db: TranscrobesDatabase,
  listId?: string,
): Promise<ListFirstSuccessStats | null> {
  const knownCards = await getKnownCards(db);
  let allListGraphs: Map<string, string>;
  let knownGraphs = new Map<string, string>();
  if (listId) {
    const goalWordList = (await db.wordlists.findByIds([listId]).exec()).get(listId);
    if (!goalWordList) {
      return null;
    }

    allListGraphs = await getGraphs(db, goalWordList.wordIds);
    for (const [wordId, graph] of allListGraphs) {
      if (knownCards.has(wordId)) {
        knownGraphs.set(wordId, graph);
      }
    }
  } else {
    allListGraphs = await getGraphs(db, [...knownCards.keys()]);
    knownGraphs = allListGraphs;
  }

  let allChars = "";
  for (const graph of allListGraphs.values()) {
    allChars += graph;
  }
  const nbUniqueWords = allListGraphs.size;
  const uniqueListChars = new Set([...allChars]);
  const nbUniqueCharacters = uniqueListChars.size;
  const allWordsMap = new Map([...allListGraphs.values()].map((graph) => [graph, 1]));
  const successWords = getSuccessWords(knownCards, knownGraphs, allWordsMap);
  const knownChars = getKnownChars(knownCards, knownGraphs);
  const successChars: FirstSuccess[] = [];
  for (const [char, firstSuccessDate] of knownChars.entries()) {
    if (uniqueListChars.has(char)) {
      successChars.push({
        firstSuccess: firstSuccessDate,
        nbOccurrences: 1,
      });
    }
  }
  successChars.sort((a, b) => a.firstSuccess - b.firstSuccess);
  successWords.sort((a, b) => a.firstSuccess - b.firstSuccess);
  return {
    successChars,
    successWords,
    nbUniqueCharacters,
    nbUniqueWords,
  };
}

export async function getSerialisableCardWords(db: TranscrobesDatabase): Promise<SerialisableDayCardWords> {
  // FIXME:
  // Is this the best way to do this?
  // Basically, there are three states:
  // "new": in the list to learn but not seen yet, so we want it translated
  // "learning": in the list to learn and we sort of know/have started learning, so we don't want it translated
  // "known": we know it, so we don't want to have it in active learning, and we don't want it translated

  const allCardWordIds = Array.from(new Set((await db.cards.find().exec()).flatMap((x) => x.wordId())));

  // If we have at least one card with an firstSuccessDate greater than zero,
  // it is considered "known" (here meaning simply "we don't want it translated in content we're consuming")
  const knownWordIds = new Set<string>(
    (
      await db.cards
        .find({
          selector: { $or: [{ known: { $eq: true } }, { firstSuccessDate: { $gt: 0 } }] },
        })
        .exec()
    ).flatMap((x) => x.wordId()),
  );

  const allCardWords = await db.definitions.findByIds(allCardWordIds).exec();
  const allCardWordGraphs: SerialisableStringSet = {};
  const knownCardWordGraphs: SerialisableStringSet = {};
  const knownCardWordChars: SerialisableStringSet = {};
  for (const [wordId, word] of allCardWords) {
    allCardWordGraphs[word.graph] = null;
    if (knownWordIds.has(wordId)) {
      for (const char of word.graph) {
        knownCardWordChars[char] = null;
      }
      knownCardWordGraphs[word.graph] = null;
    }
  }

  return {
    knownCardWordGraphs,
    knownCardWordChars,
    allCardWordGraphs,
    knownWordIdsCounter: pythonCounter(knownWordIds),
  };
}

export async function submitContentEnrichRequest(
  db: TranscrobesDatabase,
  { contentId }: { contentId: string },
): Promise<string> {
  // This is done via a bit of a hack - in the graphql endpoint we look to see if the state
  // changes to PROCESSING.REQUESTED, and if so we launch an enrich operation. There is likely
  // a much cleaner way...
  const content = await db.contents
    .findOne({
      // selector: { _id: contentId },
      selector: { id: { $eq: contentId } },
    })
    .exec();
  if (!content) {
    console.error("Unable to find content for updating", contentId);
    return "failure";
  }
  await content.incrementalPatch({ processing: PROCESSING.REQUESTED });
  console.debug("Updated content > processing: PROCESSING.REQUESTED", content);
  return "success";
}

export async function saveSurvey(
  db: TranscrobesDatabase,
  { surveyId, dataValue }: { surveyId: string; dataValue: string },
): Promise<string> {
  const userSurvey = await db.usersurveys
    .findOne({
      selector: { surveyId: { $eq: surveyId } },
    })
    .exec();
  if (userSurvey && isRxDocument(userSurvey)) {
    // It's an update
    await userSurvey.incrementalPatch({
      data: dataValue,
    });
  } else {
    const newSurvey = {
      id: uuidv4(),
      surveyId: surveyId,
      data: dataValue,
      title: "title",
    };
    await db.usersurveys.insert(newSurvey);
  }
  return "success";
}

export async function getWordListWordIds(db: TranscrobesDatabase, wordListId: string): Promise<string[]> {
  const wordList = await db.wordlists.findByIds([wordListId]).exec();
  return wordList.get(wordListId)?.wordIds || [];
}

export async function getDefaultWordLists(db: TranscrobesDatabase): Promise<SelectableListElementType[]> {
  return [...(await db.wordlists.find().exec())].map((x) => {
    return { label: x.name, value: x.id, selected: x.default };
  });
}

export async function getUserListWords(db: TranscrobesDatabase): Promise<{
  userListWords: UserListWordType;
  wordListNames: WordListNamesType;
}> {
  const listsBase: { [key: string]: string[] } = [...(await db.wordlists.find().exec())].reduce(
    (a, x) => ({ ...a, [x.id]: [x.name, x.wordIds] }),
    {},
  );
  const userListWords: UserListWordType = {};
  const wordListNames: WordListNamesType = {};

  for (const p in listsBase) {
    const name = listsBase[p][0];
    wordListNames[p] = name;
    const wordIds = listsBase[p][1];
    const l = wordIds.length;
    for (let i = 0; i < l; i++) {
      if (wordIds[i] in userListWords) {
        userListWords[wordIds[i]].push({ listId: p, position: i + 1 });
      } else {
        userListWords[wordIds[i]] = [{ listId: p, position: i + 1 }];
      }
    }
  }
  return { userListWords, wordListNames };
}

export async function getWordDetails(db: TranscrobesDatabase, graph: string): Promise<WordDetailsType> {
  const details = await getWordDetailsUnsafe(db, graph);
  let chars: (CharacterType | null)[] = [];
  if (details.word) {
    chars = details.word.graph.split("").map((w) => {
      const achar = details.characters.get(w);
      if (achar) return clone(achar.toJSON());
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
  return safe;
}

export async function getCardsForExport(db: TranscrobesDatabase) {
  const allCards = await db.cards
    .find({ selector: { $or: [{ known: { $eq: true } }, { firstSuccessDate: { $gt: 0 } }] } })
    .exec();
  const definitions = await db.definitions.findByIds(allCards.map((card) => getWordId(card))).exec();

  const output = allCards
    .map((card) => card.toJSON())
    .map(
      ({
        id,
        front,
        updatedAt,
        suspended,
        back,
        known,
        dueDate,
        firstRevisionDate,
        firstSuccessDate,
        lastRevisionDate,
        ...card
      }) => {
        return {
          graph: definitions.get(getWordId(id))?.graph,
          cardType: $enum(CARD_TYPES).getKeyOrDefault(getCardTypeAsInt(id)),
          front: front ? draftToHtml(JSON.parse(front)) : "",
          lastRevisionDate: lastRevisionDate ? dayjs(lastRevisionDate * 1000).format("YYYY-MM-DD HH:mm") : "",
          firstRevisionDate: firstRevisionDate ? dayjs(firstRevisionDate * 1000).format("YYYY-MM-DD HH:mm") : "",
          firstSuccessDate: firstSuccessDate ? dayjs(firstSuccessDate * 1000).format("YYYY-MM-DD HH:mm") : "",
          dueDate: dueDate ? dayjs(dueDate * 1000).format("YYYY-MM-DD HH:mm") : "",
          ...card,
        };
      },
    );
  return output;
}

export async function getWordStatsForExport(db: TranscrobesDatabase) {
  const allCards = await db.cards
    .find({ selector: { $or: [{ known: { $eq: true } }, { firstSuccessDate: { $gt: 0 } }] } })
    .exec();
  const wordModelStats = await db.word_model_stats.find().exec();
  const definitions = await db.definitions
    .findByIds(wordModelStats.map((wms) => wms.id).concat(allCards.map((card) => getWordId(card))))
    .exec();
  const exportStats: Record<string, ExportDetails> = {};
  for (const wms of wordModelStats) {
    const word = definitions.get(wms.id);
    if (!word) continue; // shouldn't be possible...
    exportStats[word.graph] = {
      firstRevisionDate: 0,
      firstSuccessDate: 0,
      lastRevisionDate: 0,
      dueDate: 0,
      lastChecked: wms.lastChecked || 0,
      lastSeen: wms.lastSeen || 0,
      nbChecked: wms.nbChecked || 0,
      nbSeen: wms.nbSeen || 0,
      nbSeenSinceLastCheck: wms.nbSeenSinceLastCheck || 0,
    };
  }
  for (const card of allCards) {
    if (!card.firstRevisionDate) continue;

    const word = definitions.get(getWordId(card));
    if (!word) continue; // shouldn't be possible...
    const stat = exportStats[word.graph] || { ...DefaultExportDetails };

    if (card.firstRevisionDate && (!stat.firstRevisionDate || stat.firstRevisionDate > card.firstRevisionDate)) {
      stat.firstRevisionDate = card.firstRevisionDate;
    }
    if (card.firstSuccessDate && (!stat.firstSuccessDate || stat.firstSuccessDate > card.firstSuccessDate)) {
      stat.firstSuccessDate = card.firstSuccessDate;
    }
    if (card.lastRevisionDate && (!stat.lastRevisionDate || stat.lastRevisionDate < card.lastRevisionDate)) {
      stat.lastRevisionDate = card.lastRevisionDate;
    }
    if (card.dueDate && (!stat.dueDate || stat.dueDate > card.dueDate)) {
      stat.dueDate = card.dueDate;
    }
    exportStats[word.graph] = stat;
  }
  const output = Object.entries(exportStats).map(([graph, stat]) => {
    return {
      graph,
      nbChecked: stat.nbChecked,
      nbSeenSinceLastCheck: stat.nbSeenSinceLastCheck,
      nbSeen: stat.nbSeen,
      lastChecked: stat.lastChecked ? dayjs(stat.lastChecked * 1000).format("YYYY-MM-DD HH:mm") : "",
      lastSeen: stat.lastSeen ? dayjs(stat.lastSeen * 1000).format("YYYY-MM-DD HH:mm") : "",
      lastRevisionDate: stat.lastRevisionDate ? dayjs(stat.lastRevisionDate * 1000).format("YYYY-MM-DD HH:mm") : "",
      firstRevisionDate: stat.firstRevisionDate ? dayjs(stat.firstRevisionDate * 1000).format("YYYY-MM-DD HH:mm") : "",
      firstSuccessDate: stat.firstSuccessDate ? dayjs(stat.firstSuccessDate * 1000).format("YYYY-MM-DD HH:mm") : "",
      dueDate: stat.dueDate ? dayjs(stat.dueDate * 1000).format("YYYY-MM-DD HH:mm") : "",
    };
  });
  return output;
}

export async function getWordsByGraphs(
  db: TranscrobesDatabase,
  { graphs }: { graphs: string[] },
): Promise<DefinitionType[]> {
  return (
    await Promise.all(
      graphs.map((s) =>
        db.definitions
          .findOne({
            selector: { graph: { $eq: s } },
          })
          .exec(),
      ),
    )
  )
    .filter((s: any) => !!s)
    .map((s) => clone(s!.toJSON()));
}

async function getWordDetailsUnsafe(db: TranscrobesDatabase, graph: string): Promise<WordDetailsRxType> {
  const word = await db.definitions
    .findOne({
      selector: { graph: { $eq: graph } },
    })
    .exec();

  if (word) {
    const cards = await db.cards
      .findByIds(
        $enum(CARD_TYPES)
          .getValues()
          .map((cardType) => getCardId(word.id, cardType)),
      )
      .exec();
    const wordModelStats = [...(await db.word_model_stats.findByIds([word.id]).exec()).values()][0];
    const characters = await getCharacterDetailsUnsafe(db, graph.split(""));
    const sents = await getRecentSentences(db, [word.id]);
    const recentPosSentences = (sents.length > 0 && sents[0][1].posSentences) || null;
    return { word, cards, characters, wordModelStats, recentPosSentences };
  }
  return {
    word: null,
    cards: new Map<string, CardDocument>(),
    characters: new Map<string, CharacterDocument>(),
    recentPosSentences: null,
    wordModelStats: null,
  };
}

export async function getCharacterDetails(
  db: TranscrobesDatabase,
  graphs: string[],
): Promise<(CharacterType | null)[]> {
  let chars: (CharacterType | null)[] = [];
  const values = await getCharacterDetailsUnsafe(db, graphs);
  if (graphs && graphs.length > 0) {
    chars = graphs.map((w: string) => {
      const word = values.get(w);
      if (word) return clone(word.toJSON());
      else return null;
    });
  }
  return chars;
}

async function getCharacterDetailsUnsafe(
  db: TranscrobesDatabase,
  graphs: string[],
): Promise<Map<string, CharacterDocument>> {
  return await db.characters.findByIds(graphs).exec();
}

export async function createCards(
  db: TranscrobesDatabase,
  newCards: CardType[],
): Promise<{ success: CardType[]; error: RxStorageWriteError<CardType>[] }> {
  const values = await db.cards.bulkInsert(newCards);
  const success = values.success.map((x) => x.toJSON());
  return { error: values.error, success };
}

export async function updateRecentSentences(db: TranscrobesDatabase, sentences: RecentSentencesType[]): Promise<void> {
  for (const s of cleanSentences(sentences)) {
    // Don't wait. Is this Ok?
    db.recentsentences.incrementalUpsert({
      id: s.id.toString(),
      lzContent: LZString.compressToUTF16(JSON.stringify(s.posSentences)),
    });
  }
}

function cleanSentences(sentences: RecentSentencesType[]): RecentSentencesType[] {
  for (const recentSentence of sentences) {
    for (const posSentences of Object.values(recentSentence.posSentences)) {
      if (posSentences) {
        for (const posSentence of posSentences) {
          posSentence.sentence = cleanSentence(posSentence.sentence);
        }
      }
    }
  }
  return sentences;
}

export async function addRecentSentences(db: TranscrobesDatabase, sentences: RecentSentencesType[]): Promise<void> {
  await db.recentsentences.bulkInsert(
    cleanSentences(sentences).map((s) => {
      return {
        id: s.id.toString(),
        lzContent: LZString.compressToUTF16(JSON.stringify(s.posSentences)),
        updatedAt: 0,
      };
    }),
  );
}

export async function getRecentSentences(
  db: TranscrobesDatabase,
  ids: string[],
): Promise<Array<[string, RecentSentencesType]>> {
  const sents = new Array<[string, RecentSentencesType]>();
  for (const [key, value] of (await db.recentsentences.findByIds(ids).exec()).entries()) {
    const recents = recentSentencesFromLZ(key, value.lzContent);
    if (recents) sents.push([key, recents]);
  }
  return sents;
}

export async function getWordFromDBs(db: TranscrobesDatabase, graph: string): Promise<DefinitionType | null> {
  const word = await db.definitions
    .findOne({
      selector: { graph: { $eq: graph } },
    })
    .exec();
  return word ? clone(word.toJSON()) : null;
}

export async function getContentConfigFromStore(
  db: TranscrobesDatabase,
  contentId: number,
): Promise<ContentConfigType> {
  const dbValue = await db.content_config.findOne(contentId.toString()).exec();
  const returnVal = dbValue ? JSON.parse(dbValue.configString || "{}") : {};
  return returnVal;
}

export async function setContentConfigToStore(
  db: TranscrobesDatabase,
  contentConfig: ContentConfigType,
): Promise<boolean> {
  if (!contentConfig.id.toString()) {
    console.warn("Trying to save a contentConfig without an id", contentConfig);
    return false;
  } else {
    await db.content_config.incrementalUpsert({
      id: contentConfig.id.toString(),
      configString: JSON.stringify(contentConfig),
    });
    return true;
  }
}

export async function submitActivityEvent(db: TranscrobesDatabase, activity: UserActivityType): Promise<boolean> {
  // console.log("submitActivityEvent", activity);
  await db.activityqueue.insert(activity);
  return true;
}

// FIXME: userStatsMode should be an enum
// remove lemmaAndContexts any
export async function submitLookupEvents(
  db: TranscrobesDatabase,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  { lemmaAndContexts, userStatsMode, source }: { lemmaAndContexts: any; userStatsMode: number; source: string },
): Promise<boolean> {
  const events: ActionEvent[] = [];
  for (const lemmaAndContext of lemmaAndContexts) {
    events.push({
      type: "bc_word_lookup",
      data: lemmaAndContext,
      userStatsMode: userStatsMode,
      source: source,
    });
  }
  return await submitUserEvents(db, events);
}

// FIXME: seriously consider typing the eventData...
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function submitUserEvents(db: TranscrobesDatabase, eventData: any): Promise<boolean> {
  let uuid = UUID();
  while (await db.event_queue.findOne(uuid).exec()) {
    console.debug(`looks like event ${uuid} already exists, looking for another`);
    uuid = UUID();
  }
  await db.event_queue.insert({
    id: uuid.toString(),
    eventString: JSON.stringify(eventData),
  });
  return true;
}

export async function addOrUpdateCardsForWord(
  db: TranscrobesDatabase,
  { wordId, grade }: { wordId: string; grade: number },
): Promise<CardType[]> {
  const cards: CardType[] = [];
  for (const cardType of $enum(CARD_TYPES).getValues()) {
    const cardId = getCardId(wordId, cardType);
    const existing = await db.cards.findOne(cardId).exec();
    cards.push(
      await practiceCard(db, {
        currentCard: existing || { id: cardId },
        grade,
        badReviewWaitSecs: 0,
      }),
    ); // Promise.all?
  }
  return cards;
}

// FIXME: any, this will require not using the isRxDocument and being clean
export async function practiceCard(
  db: TranscrobesDatabase,
  { currentCard, grade, badReviewWaitSecs }: { currentCard: any; grade: number; badReviewWaitSecs: number },
): Promise<CardType> {
  const isCardDoc = isRxDocument(currentCard) && "toJSON" in currentCard;
  const cardToSave = practice(isCardDoc ? currentCard.toJSON() : currentCard, grade, badReviewWaitSecs);
  let cardObject: CardDocument;

  const newDate = dayjs().unix();
  if (isCardDoc) {
    // It's an update
    cardObject = currentCard;
    const newValues = {
      interval: cardToSave.interval,
      repetition: cardToSave.repetition,
      efactor: cardToSave.efactor,
      dueDate: cardToSave.dueDate,
      known: cardToSave.known,
      firstSuccessDate: cardToSave.firstSuccessDate,
      lastRevisionDate: newDate,
    };
    await cardObject.incrementalPatch(newValues);
  } else {
    if (!cardToSave.firstRevisionDate) {
      cardToSave.firstRevisionDate = newDate;
    }
    cardToSave.lastRevisionDate = newDate;
    cardObject = await db.cards.upsert(cardToSave);
  }
  return cardObject.toJSON();
}

export async function updateCard(db: TranscrobesDatabase, card: CardType): Promise<void> {
  await db.cards.upsert(card);
}

export async function practiceCardsForWord(
  db: TranscrobesDatabase,
  practiceDetails: PracticeDetailsType,
): Promise<void> {
  const wordInfo = practiceDetails.wordInfo;
  const grade = practiceDetails.grade;

  const existing = await db.cards
    .findByIds(
      $enum(CARD_TYPES)
        .getValues()
        .map((cardType) => getCardId(wordInfo.id, cardType)),
    )
    .exec();

  for (const cardType of $enum(CARD_TYPES).getValues()) {
    const cardId = getCardId(wordInfo.id, cardType);
    const card = existing.get(cardId) || { id: cardId };
    // here failureSeconds doesn't really have meaning
    await practiceCard(db, { currentCard: card, grade, badReviewWaitSecs: 0 });
  }
}

async function orderVocabReviews(
  db: TranscrobesDatabase,
  ordering: WordOrdering,
  potentialWordIds: string[],
): Promise<DefinitionDocument[]> {
  const existingCards = new Set<string>((await db.cards.find().exec()).flatMap((x) => x.wordId()));
  const wordIdsNoCard = [...new Set<string>(potentialWordIds.filter((x) => !existingCards.has(x)))];
  const potentialWordsMap = await db.definitions.findByIds(wordIdsNoCard).exec();
  let potentialWords: DefinitionDocument[] = [];
  if (ordering === "WCPM") {
    potentialWords = [...potentialWordsMap.values()].sort(sortByWcpm);
  } else if (ordering === "Personal") {
    const seenWords = await db.word_model_stats.findByIds(wordIdsNoCard).exec();
    const orderedSeenWords = [...seenWords.values()].sort((a, b) => {
      return (b.nbSeen || 0) - (a.nbSeen || 0);
    });
    // get the ones we have seen that have no cards, ordered by times seen
    for (let i = 0; i < orderedSeenWords.length; i++) {
      const word = potentialWordsMap.get(orderedSeenWords[i].id);
      if (word) {
        potentialWords.push(word);
      }
    }
    // get the rest with natural ordering (ie, no extra ordering)
    for (let i = 0; i < wordIdsNoCard.length; i++) {
      if (!seenWords.has(wordIdsNoCard[i])) {
        const word = potentialWordsMap.get(wordIdsNoCard[i]);
        if (word) {
          potentialWords.push(word);
        }
      }
    }
  } else {
    // TODO: this ordering is a bit arbitrary. If there is more than one list that has duplicates then
    // I don't know which version gets ignored, though it's likely the second. Is this what is wanted?
    for (let i = 0; i < wordIdsNoCard.length; i++) {
      const word = potentialWordsMap.get(wordIdsNoCard[i]);
      if (word) {
        potentialWords.push(word);
      }
    }
  }

  return potentialWords;
}

export async function getVocabReviews(
  db: TranscrobesDatabase,
  graderConfig: GraderConfig,
): Promise<DefinitionType[] | null> {
  const selectedLists = graderConfig.wordLists.filter((x) => x.selected).map((x) => x.value);
  if (selectedLists.length === 0) {
    console.debug("No wordLists, not trying to find reviews");
    return null;
  }
  const wordListObjects = (await db.wordlists.findByIds(selectedLists).exec()).values();
  const potentialWordIds = [...new Set<string>([...wordListObjects].flatMap((x) => x.wordIds))];
  const potentialWords = await orderVocabReviews(db, graderConfig.itemOrdering, potentialWordIds);
  return potentialWords.slice(0, graderConfig.itemsPerPage).filter((x) => !!x);
}

function getEmptyDailyReviewables(): DailyReviewables {
  return {
    allReviewableDefinitions: new Map<string, DefinitionType>(),
    potentialCardsMap: new Map<string, Set<string>>(),
    existingCards: new Map<string, CardType>(),
    allPotentialCharacters: new Map<string, CharacterType>(),
    recentSentences: new Map<string, RecentSentencesStoredType>(),
  };
}

async function orderedPotentialCardsMap(
  db: TranscrobesDatabase,
  ordering: WordOrdering,
  inPotentialCardsMap: Map<string, Set<string>>,
  potentialWordsMap: Map<string, DefinitionDocument>,
): Promise<Map<string, Set<string>>> {
  // By default order according to the order of the lists or by wcpm from the Ghent lads
  // we have the final set of potential cards, now we just need to set the final ordering
  if (ordering === "WCPM") {
    const potentialWords: DefinitionDocument[] = [];
    for (const wordId of inPotentialCardsMap.keys()) {
      const def = potentialWordsMap.get(wordId);
      if (def) potentialWords.push(def);
    }
    potentialWords.sort(sortByWcpm);
    const potentialCardsMap = new Map<string, Set<string>>();
    for (const def of potentialWords) {
      const goodDef = inPotentialCardsMap.get(def.id);
      if (goodDef) potentialCardsMap.set(def.id, goodDef);
    }
    return potentialCardsMap;
  } else if (ordering === "Personal") {
    const cardWordIds = [...new Set<string>([...inPotentialCardsMap.keys()].map((x) => getWordId(x)))];
    const seenWords = await db.word_model_stats.findByIds(cardWordIds).exec();
    const orderedSeenWords = [...seenWords.values()].sort((a, b) => {
      return (b.nbSeen || 0) - (a.nbSeen || 0);
    });
    const potentialCardsMap = new Map<string, Set<string>>();
    // get the ones we have seen that have no cards, ordered by times seen
    for (let i = 0; i < orderedSeenWords.length; i++) {
      const goodDef = inPotentialCardsMap.get(orderedSeenWords[i].id);
      if (goodDef) potentialCardsMap.set(orderedSeenWords[i].id, goodDef);
    }
    // get the rest with natural ordering (ie, no extra ordering)
    const inWordIds = [...inPotentialCardsMap.keys()];
    for (let i = 0; i < inWordIds.length; i++) {
      // here there is no reason to check whether it's already there - setting is O(1) and
      // setting an object that is already present won't change the ordering
      const goodDef = inPotentialCardsMap.get(inWordIds[i]);
      if (goodDef) potentialCardsMap.set(inWordIds[i], goodDef);
    }
    return potentialCardsMap;
  } else {
    return inPotentialCardsMap;
  }
}

async function getPotentialWordIds(
  db: TranscrobesDatabase,
  activityConfig: RepetrobesActivityConfigType,
): Promise<Set<string>> {
  if (activityConfig.systemWordSelection) {
    const seenWords = await db.word_model_stats.find().exec();
    const potentialWordIds = new Set<string>(
      [...seenWords.values()]
        .sort((a, b) => {
          return (b.nbSeen || 0) - (a.nbSeen || 0);
        })
        .map((x) => x.id),
    );
    const selectedLists = (await getDefaultWordLists(db)).filter((x) => x.selected).map((x) => x.value);
    const selectedListsWordIds = await db.wordlists.findByIds(selectedLists).exec();
    for (const sl of selectedLists) {
      const wordlist = selectedListsWordIds.get(sl);
      if (wordlist) {
        for (const wordId of wordlist.wordIds) {
          potentialWordIds.add(wordId);
        }
      }
    }
    return potentialWordIds;
  } else {
    const selectedLists = (activityConfig.wordLists || []).filter((x) => x.selected).map((x) => x.value);
    // wordIds that *haven't* already been reviewed today and are in the right lists
    // so this is BOTH the possible new words *and* reviews
    const selectedListsWordIds = await db.wordlists.findByIds(selectedLists).exec();
    // the ids of the potential words, ordered by list order (first by list, then by ordering within
    // the list)
    const potentialWordIds = new Set<string>(
      [...selectedLists.map((sl) => selectedListsWordIds.get(sl))].flatMap((x) => x!.wordIds),
    );
    return potentialWordIds;
  }
}

export async function getSRSReviews(
  db: TranscrobesDatabase,
  conf: { activityConfig: RepetrobesActivityConfigType; fromLang: InputLanguage },
): Promise<DailyReviewables> {
  if (!configIsUsable(conf.activityConfig)) {
    console.debug("No wordLists or config not usable, not trying to find reviews");
    return getEmptyDailyReviewables();
  }
  const potentialWordIds = await getPotentialWordIds(db, conf.activityConfig);
  const allKnownWordIds = new Set<string>();
  const existingCards = new Map<string, CardDocument>();
  const todaysStudiedWords = new Set<string>();
  const allCards = await db.cards.find().exec();
  for (const card of allCards) {
    if (card.known) {
      allKnownWordIds.add(card.wordId());
    }
    if (card.firstRevisionDate > 0) {
      existingCards.set(card.id, card);
    }
    if (card.lastRevisionDate > conf.activityConfig.todayStarts) {
      todaysStudiedWords.add(card.wordId());
    }
  }
  // Clean the potential wordIds of those we that are already known or we have already seen today
  for (const wordId of potentialWordIds) {
    if (allKnownWordIds.has(wordId) || todaysStudiedWords.has(wordId)) potentialWordIds.delete(wordId);
  }
  const selectedTypes = (conf.activityConfig.activeCardTypes || [])
    .filter((ac) => ac.selected)
    .map((act) => `${act.value}`);

  // Map of all the possible wordIds, with a set of all possible types
  let potentialCardsMap = new Map<string, Set<string>>();
  for (const wordId of potentialWordIds) {
    for (const cardType of selectedTypes) {
      const cardId = getCardId(wordId, cardType);
      if (!existingCards.has(cardId)) {
        if (!potentialCardsMap.has(wordId)) {
          potentialCardsMap.set(wordId, new Set<string>());
        }
        potentialCardsMap.get(wordId)!.add(cardType);
      }
    }
  }
  // Now we have all the possible new cards and all the existing cards

  // Get all the wordIds for the existing cards
  const allWordIdsForExistingCards = new Set<string>([...existingCards.keys()].map((ec) => getWordId(ec)));
  // get all of the recentSentences
  const recentSentences: Map<string, RecentSentencesDocument> = await db.recentsentences
    .findByIds([...allWordIdsForExistingCards].concat([...potentialCardsMap.keys()]))
    .exec();
  // FIXME: to decide
  // we actually need to know all the words that have been reviewed today, so
  // even though we can use these for revisions, we still need them...
  // Remove all of the existing cards of type PHRASE that no longer have any recentSentences
  // and don't have any *other* cards for the word
  for (const ec of existingCards.values()) {
    if (ec.cardType() === CARD_TYPES.PHRASE.toString() && !recentSentences.has(ec.wordId())) {
      existingCards.delete(ec.id);
      const otherCardTypes = $enum(CARD_TYPES)
        .getValues()
        .filter((x) => x !== CARD_TYPES.PHRASE);
      let hasOtherExistingCard = false;
      for (const cardType of otherCardTypes) {
        if (existingCards.has(getCardId(ec.wordId(), cardType))) {
          hasOtherExistingCard = true;
          break;
        }
      }
      if (!hasOtherExistingCard) {
        allWordIdsForExistingCards.delete(ec.wordId());
      }
    }
  }

  // Remove all of the potential cards of type PHRASE that don't have any recentSentences
  if (selectedTypes.find((st) => st === CARD_TYPES.PHRASE.toString())) {
    for (const [wordId, cardTypes] of potentialCardsMap.entries()) {
      if (cardTypes.has(CARD_TYPES.PHRASE.toString()) && !recentSentences.has(wordId)) {
        cardTypes.delete(CARD_TYPES.PHRASE.toString());
      }
      if (cardTypes.size === 0) {
        potentialCardsMap.delete(wordId);
      }
    }
  }
  // get all the definitions for both the existing and potential news
  const allReviewableDefinitions: Map<string, DefinitionDocument> = await db.definitions
    .findByIds([...potentialCardsMap.keys()].concat([...allWordIdsForExistingCards]))
    .exec();

  // now clean the potential news and definitions that might have invalid graphs (for reviewing anyway!)
  const cleanReviewableDefinitions = new Map<string, DefinitionType>();
  for (const def of allReviewableDefinitions.values()) {
    if (
      (potentialCardsMap.has(def.id) && simpOnly(def.graph, conf.fromLang)) ||
      allWordIdsForExistingCards.has(def.id)
    ) {
      cleanReviewableDefinitions.set(def.id, clone(def.toJSON()));
    } else if (potentialCardsMap.has(def.id)) {
      // it doesn't only have simplified chars, so we can't/won't review
      potentialCardsMap.delete(def.id);
      allReviewableDefinitions.delete(def.id);
    }
  }

  if (!conf.activityConfig.systemWordSelection) {
    // systemWordSelection is already sorted
    potentialCardsMap = await orderedPotentialCardsMap(
      db,
      conf.activityConfig.newCardOrdering,
      potentialCardsMap,
      allReviewableDefinitions,
    );
  }

  // Get all the chars that we have for all the definitions graphs
  const allPotentialCharacters: Map<string, CharacterDocument> = await db.characters
    .findByIds([...new Set<string>([...allReviewableDefinitions.values()].map((x) => x.graph).join(""))])
    .exec();
  return {
    allReviewableDefinitions: cleanReviewableDefinitions,
    potentialCardsMap,
    existingCards: new Map<string, CardType>([...existingCards.values()].map((v) => [v.id, clone(v.toJSON())])),
    allPotentialCharacters: new Map<string, CharacterType>(
      [...allPotentialCharacters.values()].map((v) => [v.id, clone(v.toJSON())]),
    ),
    recentSentences: new Map<string, RecentSentencesStoredType>(
      [...recentSentences.values()].map((v) => [v.id, clone(v.toJSON())]),
    ),
  };
}

export async function getDayStats(
  db: TranscrobesDatabase,
  { studentId }: { studentId?: number },
): Promise<DayModelStatsType[]> {
  if (studentId) {
    return [
      ...(await db.student_day_model_stats
        .find({
          selector: { studentId: { $eq: studentId } },
        })
        .exec()),
    ].map((stat) => stat.toJSON());
  } else {
    return [...(await db.day_model_stats.find().exec())].map((stat) => stat.toJSON());
  }
}

export async function saveDictionaryEntries(
  db: TranscrobesDatabase,
  { entries, dictionaryId }: { entries: Record<string, UserDefinitionType>; dictionaryId: string },
): Promise<void> {
  const dictionary = (await db.userdictionaries.findByIds([dictionaryId]).exec()).get(dictionaryId);
  await dictionary?.incrementalPatch({ lzContent: LZString.compressToUTF16(JSON.stringify(entries)) });
}

export async function getAllShortChars(db: TranscrobesDatabase): Promise<Record<string, ShortChar>> {
  const entries = await db.characters.find().exec();
  const chars: Record<string, ShortChar> = {};
  for (const char of entries) {
    chars[char.id] = { id: char.id, radical: char.radical };
  }
  return chars;
}

export async function getAllShortWords(
  db: TranscrobesDatabase,
  fromLang: InputLanguage,
): Promise<Record<string, ShortWord>> {
  const entries = await db.definitions.find().exec();
  const words: Record<string, ShortWord> = {};
  for (const word of entries) {
    words[word.graph] = {
      id: word.graph,
      sounds: cleanedSound(word, fromLang),
      // FIXME: ugly hack!
      isDict: word.providerTranslations.filter((x) => x.provider !== "fbk" && x.posTranslations.length > 0).length > 0,
    };
  }
  return words;
}

export async function getDictionaryEntries(
  db: TranscrobesDatabase,
  { dictionaryId }: { dictionaryId: string },
): Promise<Record<string, UserDefinitionType>> {
  const entry = (await db.userdictionaries.findByIds([dictionaryId]).exec()).get(dictionaryId);
  return (
    (entry?.lzContent &&
      (JSON.parse(LZString.decompressFromUTF16(entry?.lzContent) || "{}") as Record<string, UserDefinitionType>)) ||
    {}
  );
}

export async function getAllUserDictionaryEntries(db: TranscrobesDatabase): Promise<Record<string, null>> {
  const dicts = await db.userdictionaries.find().exec();
  const allEntries: Record<string, null> = {};
  for (const dict of dicts) {
    if (dict.lzContent) {
      const dictEntries = JSON.parse(LZString.decompressFromUTF16(dict.lzContent) || "{}");
      for (const key of Object.keys(dictEntries)) {
        allEntries[key] = null;
      }
    }
  }
  return allEntries;
}

export async function getLanguageClassParticipants(
  db: TranscrobesDatabase,
  { classId, className }: { classId: string; className?: string },
): Promise<Participants> {
  if (!className) {
    const classDoc = (await db.languageclasses.findByIds([classId]).exec()).get(classId);
    if (!classDoc) {
      throw new Error(`Class ${classId} not found`);
    }
    className = classDoc.title;
  }
  const teacherregistrations = await db.teacherregistrations
    .find({
      selector: { classId: { $eq: classId } },
    })
    .exec();
  const studentregistrations = await db.studentregistrations
    .find({
      selector: { classId: { $eq: classId } },
    })
    .exec();

  const teacherIds = new Map<string, TeacherRegistrationType>();
  const studentIds = new Map<string, StudentRegistrationType>();
  for (const registration of teacherregistrations) {
    teacherIds.set(registration.userId, registration);
  }
  for (const registration of studentregistrations) {
    studentIds.set(registration.userId, registration);
  }

  const users = [...(await db.persons.findByIds([...teacherIds.keys(), ...studentIds.keys()]).exec()).values()];
  const participants: Participants = {
    students: [],
    teachers: [],
  };
  for (const user of [...users]) {
    if (teacherIds.has(user.id)) {
      participants.teachers.push({
        id: teacherIds.get(user.id)!.id,
        className,
        classId,
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: teacherIds.get(user.id)!.createdAt || 0,
      });
    }
    if (studentIds.has(user.id)) {
      participants.students.push({
        id: studentIds.get(user.id)!.id,
        className,
        classId,
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: studentIds.get(user.id)!.createdAt || 0,
      });
    }
  }
  return participants;
}

export async function forceDefinitionsInitialSync(): Promise<void> {
  console.log("Starting initial sync of definitions");
  const rs = replStates.get("definitions");
  await rs?.awaitInitialReplication();
  console.log("Done with initial sync of definitions");
}
