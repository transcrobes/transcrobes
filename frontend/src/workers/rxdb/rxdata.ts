import LZString from "lz-string";
import { isRxDocument } from "rxdb";
import { v4 as uuidv4 } from "uuid";
import { UUID, cleanSentence, recentSentencesFromLZ } from "../../lib/funclib";
import { fetchPlus, fetchPlusResponse } from "../../lib/libMethods";
import {
  ACTIVITY_TIMEOUT,
  ActionEvent,
  CardType,
  ClassRegistrationRequest,
  ContentConfigType,
  Import,
  MIN_ACTIVITY_LENGTH,
  PROCESSING,
  PROCESS_TYPE,
  RecentSentencesType,
  SessionType,
  UserActivity,
  UserActivityType,
  UserDefinitionType,
} from "../../lib/types";
import RxDBProvider from "../../ra-data-rxdb";
import { RequestOptions } from "../../ra-data-worker";
import { getImportFileStorage } from "../common-db";
import { ActivityQueueDocument, TranscrobesDatabase } from "./Schema";

let db: TranscrobesDatabase;
export function setDb(ldb: TranscrobesDatabase) {
  db = ldb;
}

async function createEpubImportFromURL(url: string, description: string) {
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

export async function pushFiles(url: URL): Promise<{ status?: "success" }> {
  const apiEndPoint = new URL("/api/v1/enrich/import_file", url.origin).href;
  const fileStore = await getImportFileStorage();
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

async function enqueueRegistrations({
  registrations,
}: {
  registrations: ClassRegistrationRequest[];
}): Promise<boolean> {
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

async function refreshSession({ id, timestamp }: { id: string; timestamp: number }): Promise<{ status: string }> {
  if (db && id) {
    await db.sessions.incrementalUpsert({ id, timestamp });
    return { status: "success" };
  } else {
    return { status: "uninitialised" };
  }
}

export async function processRequestQueue(url: URL, maxRequests = 500): Promise<{ status: string }> {
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
      allRequests[request.endpoint].push(arequest);
      allRequestIds[request.endpoint].push(request.id.toString());
    }
  }

  if (!Object.keys(allEntries).length) {
    return { status: "empty_queue" };
  }
  for (const [endpoint, requests] of Object.entries(allRequests)) {
    const apiEndPoint = new URL(endpoint, url.origin).href;
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

export async function sendActivities(url: URL, maxSendEvents = 500): Promise<{ status: string }> {
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
  } else {
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

export async function sendUserEvents(url: URL, maxSendEvents = 500): Promise<{ status: string }> {
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

async function getAllFromDB(
  // FIXME: WARNING! Using `TranscrobesCollectionsKeys` instead of `any` makes tsc take MINUTES!
  // { collection, queryObj }: { collection: TranscrobesCollectionsKeys; queryObj?: MangoQuery<TranscrobesDocumentTypes> },
  { collection, queryObj }: { collection: any; queryObj?: any },
): // TODO: see whether this could be properly typed
Promise<any[]> {
  const values = await db[collection].find(queryObj).exec();
  return values.map((x) => x.toJSON());
}

async function getByIds(
  // { collection, ids }: { collection: TranscrobesCollectionsKeys; ids: string[] },
  { collection, ids }: { collection: any; ids: string[] },
): // TODO: see whether this could be properly typed
Promise<any[]> {
  if (ids.length === 0) return [];
  const values = await db[collection].findByIds(ids).exec();
  return [...values.values()].map((def) => def.toJSON());
}

async function submitContentEnrichRequest({ contentId }: { contentId: string }): Promise<string> {
  // This is done via a bit of a hack - in the graphql endpoint we look to see if the state
  // changes to PROCESSING.REQUESTED, and if so we launch an enrich operation. There is likely
  // a much cleaner way...
  const content = await db.contents
    .findOne({
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

async function saveSurvey({ surveyId, dataValue }: { surveyId: string; dataValue: string }): Promise<string> {
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
      surveyId,
      data: dataValue,
      title: "title",
    };
    await db.usersurveys.insert(newSurvey);
  }
  return "success";
}

async function saveAnswer({
  questionId,
  studentAnswer,
  isCorrect,
}: {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
}): Promise<string> {
  const qa = await db.questionanswers
    .findOne({
      selector: { questionId: { $eq: questionId } },
    })
    .exec();
  if (qa && isRxDocument(qa)) {
    // It's an update
    await qa.incrementalPatch({
      studentAnswer,
      isCorrect,
    });
  } else {
    const newQA = {
      id: uuidv4(),
      questionId,
      studentAnswer,
      isCorrect,
    };
    await db.questionanswers.insert(newQA);
  }
  return "success";
}

async function getAvailableRecentSentenceIds(): Promise<number[]> {
  return [...(await db.recentsentences.find().exec())].map((x) => parseInt(x.id));
}

async function updateRecentSentences(sentences: RecentSentencesType[]): Promise<void> {
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

async function addRecentSentences(sentences: RecentSentencesType[]): Promise<void> {
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

async function getRecentSentences(ids: string[]): Promise<Array<[string, RecentSentencesType]>> {
  const sents = new Array<[string, RecentSentencesType]>();
  for (const [key, value] of (await db.recentsentences.findByIds(ids).exec()).entries()) {
    const recents = recentSentencesFromLZ(key, value.lzContent);
    if (recents) sents.push([key, recents]);
  }
  return sents;
}

async function getContentConfigFromStore(contentId: string): Promise<ContentConfigType> {
  const dbValue = await db.content_config.findOne(contentId.toString()).exec();
  const returnVal = dbValue ? JSON.parse(dbValue.configString || "{}") : {};
  return returnVal;
}

async function setContentConfigToStore(contentConfig: ContentConfigType): Promise<boolean> {
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

async function submitActivityEvent(activity: UserActivityType): Promise<boolean> {
  // console.log("submitActivityEvent", activity);
  await db.activityqueue.insert(activity);
  return true;
}

async function submitLookupEvents(
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
  return await submitUserEvents(events);
}
async function submitUserEvents(eventData: any): Promise<boolean> {
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

async function updateCards(cards: CardType[]): Promise<CardType[]> {
  return (await db.cards.bulkUpsert(cards)).map((c) => c.toJSON());
}

async function setCardFront(cardId: string, frontString: string): Promise<void> {
  const cardDoc = await db.cards.findOne(cardId).exec();
  if (!cardDoc) throw new Error(`Card ${cardId} not found`);
  await cardDoc.patch({ front: frontString });
}

async function purgeInvalidRecentSentences() {
  const recentSentences = await db.recentsentences.find().exec();
  const purged: string[][] = [];
  for (const rs of recentSentences) {
    const lz = LZString.decompressFromUTF16(rs.lzContent);
    try {
      if (!lz) {
        purged.push([rs.id, rs.updatedAt.toString(), "LZ"]);
        await rs.remove();
      } else {
        JSON.parse(lz);
      }
    } catch (e) {
      purged.push([rs.id, rs.updatedAt.toString(), "JSON"]);
      await rs.remove();
    }
  }
  return purged;
}

async function saveDictionaryEntries({
  entries,
  dictionaryId,
}: {
  entries: Record<string, UserDefinitionType>;
  dictionaryId: string;
}): Promise<void> {
  const dictionary = (await db.userdictionaries.findByIds([dictionaryId]).exec()).get(dictionaryId);
  await dictionary?.incrementalPatch({ lzContent: LZString.compressToUTF16(JSON.stringify(entries)) });
}

async function getDictionaryEntries({
  dictionaryId,
}: {
  dictionaryId: string;
}): Promise<Record<string, UserDefinitionType>> {
  const entry = (await db.userdictionaries.findByIds([dictionaryId]).exec()).get(dictionaryId);
  return (
    (entry?.lzContent &&
      (JSON.parse(LZString.decompressFromUTF16(entry?.lzContent) || "{}") as Record<string, UserDefinitionType>)) ||
    {}
  );
}

async function getAllUserDictionaryEntries(): Promise<Record<string, null>> {
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

async function dataProvider({ value }: { value: RequestOptions }) {
  return await RxDBProvider({ db })[value.method](value.collection, value.params);
}

export const rxdbDataManager = {
  getAvailableRecentSentenceIds,
  dataProvider,
  getAllUserDictionaryEntries,
  getDictionaryEntries,
  saveDictionaryEntries,
  addRecentSentences,
  updateCards,
  setCardFront,
  saveSurvey,
  saveAnswer,
  setContentConfigToStore,
  submitLookupEvents,
  submitContentEnrichRequest,
  submitUserEvents,
  updateRecentSentences,
  getAllFromDB,
  getByIds,
  getContentConfigFromStore,
  getRecentSentences,
  enqueueRegistrations,
  submitActivityEvent,
  purgeInvalidRecentSentences,
  refreshSession,
};

export type RxdbDataManager = typeof rxdbDataManager;
export type RxdbDataManagerMethods = keyof typeof rxdbDataManager;
export const rxdbDataManagerKeys = Object.keys(rxdbDataManager) as RxdbDataManagerMethods[];
