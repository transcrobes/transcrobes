import { MangoQuery } from "rxdb/dist/types/core";
import { isRxDocument } from "rxdb/plugins/core";

import { sortByWcpm, shortMeaning, simpOnly } from "./lib";
import dayjs from "dayjs";
import {
  CardType,
  ContentConfigType,
  DailyReviewsType,
  DayCardWords,
  FirstSuccess,
  ImportFirstSuccessStats,
  ListFirstSuccessStats,
  GraderConfig,
  ImportAnalysis,
  PracticeDetailsType,
  PROCESSING,
  RepetrobesActivityConfigType,
  SelectableListElementType,
  UserListWordType,
  VocabReview,
  WordDetailsRxType,
  WordListNamesType,
} from "./types";
import { $enum } from "ts-enum-util";

import {
  CardDocument,
  CARD_ID_SEPARATOR,
  CARD_TYPES,
  CharacterDocument,
  DefinitionDocument,
  TranscrobesCollectionsKeys,
  TranscrobesDatabase,
  TranscrobesDocumentTypes,
} from "../database/Schema";
import { practice } from "./review";

import { pythonCounter, UUID } from "./funclib";
import { fetchPlus } from "./lib";
import { getFileStorage, IDBFileStorage } from "./IDBFileStorage";
import { getUsername } from "./JWTAuthProvider";
import { getDatabaseName } from "../database/Database";
import { RxDBDataProviderParams } from "../ra-data-rxdb";
import { v4 as uuidv4 } from "uuid";
import { RxStorageBulkWriteError } from "rxdb/dist/types/types";

const IMPORT_FILE_STORAGE = "import_file_storage";

async function getNamedFileStorage(parameters: RxDBDataProviderParams): Promise<IDBFileStorage> {
  const username = await getUsername();
  if (!username) {
    throw new Error("Unable to find the current user");
  }
  const importFileStore = getFileStorage(
    `${getDatabaseName(parameters, username)}_${IMPORT_FILE_STORAGE}`,
  );
  return importFileStore;
}

async function pushFiles(url: URL): Promise<{ status: "success" }> {
  const apiEndPoint = new URL("/api/v1/enrich/import_file", url.origin).href;
  const fileStore = await getNamedFileStorage({ url: url });
  const cacheFiles = await fileStore.list();
  for (const f in cacheFiles) {
    const upload = await fileStore.get(cacheFiles[f]);
    const fd = new FormData();
    fd.append("afile", upload);
    fd.append("filename", cacheFiles[f]);
    const result = await fetchPlus(apiEndPoint, fd);
    if (result.status === "success") {
      await fileStore.remove(cacheFiles[f]);
    } else {
      throw new Error("There was an error pushing an import file");
    }
  }
  return { status: "success" };
}

async function sendUserEvents(
  db: TranscrobesDatabase,
  url: URL,
  maxSendEvents = 500,
): Promise<{ status: string }> {
  if (!db) {
    console.debug("No db in sendUserEvents, not executing", db);
    return { status: "uninitialised" };
  }
  const allEvents: any[] = []; // FIXME: this should be a "user event" type
  const allEventIds: string[] = [];

  const allEntries = await db.event_queue
    .find({
      selector: {
        id: { $gte: null },
      },
      limit: maxSendEvents,
    })
    .exec();

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
    const message = "user_event update failed due to return status incorrect!";
    throw message;
  } else {
    // remove from queue, but no need to wait
    db.event_queue.bulkRemove(allEventIds);
  }
  return { status: "success" };
}

async function getAllFromDB(
  db: TranscrobesDatabase,
  collection: TranscrobesCollectionsKeys,
  queryObj?: MangoQuery<TranscrobesDocumentTypes>,
) {
  return await db[collection].find(queryObj).exec();
}

async function getKnownWordIds(db: TranscrobesDatabase): Promise<Set<string>> {
  const knownWordIds = new Set<string>(
    (
      await db.cards
        .find({
          selector: { $or: [{ known: { $eq: true } }, { interval: { $gt: 0 } }] },
        })
        .exec()
    ).flatMap((x) => x.wordId()),
  );

  return knownWordIds;
}

async function getKnownCards(db: TranscrobesDatabase): Promise<Map<string, CardType>> {
  const knownCards = new Map<string, CardType>();
  (
    await db.cards
      .find({
        selector: { firstSuccessDate: { $gt: 0 } },
      })
      .exec()
  ).map((card) => {
    const wordId = card.wordId();
    const first = knownCards.get(wordId);
    if (!first || first.firstSuccessDate > card.firstSuccessDate) {
      knownCards.set(wordId, card.toJSON());
    }
  });
  return knownCards;
}

async function getGraphs(db: TranscrobesDatabase, wordIds: string[]): Promise<Map<string, string>> {
  const graphs = new Map<string, string>();
  [...(await db.definitions.findByIds(wordIds)).values()].map((def) => {
    graphs.set(def.id, def.graph);
  });
  return graphs;
}

function getKnownChars(
  knownCards: Map<string, CardType>,
  knownGraphs: Map<string, string>,
): Map<string, number> {
  const knownChars = new Map<string, number>();
  for (const [wordId, card] of knownCards.entries()) {
    const chars = (knownGraphs.get(wordId) || "").split("");
    for (const char of chars) {
      const first = knownChars.get(char);
      if (!first || first > card.firstSuccessDate) {
        knownChars.set(char, card.firstSuccessDate);
      }
    }
  }
  return knownChars;
}

async function getFirstSuccessStatsForImport(
  db: TranscrobesDatabase,
  importId: string,
): Promise<ImportFirstSuccessStats> {
  const theImport = (await db.imports.findByIds([importId])).get(importId);
  if (!theImport) throw new Error("Invalid, import not found");

  const knownCards = await getKnownCards(db);
  const knownGraphs = await getGraphs(db, [...knownCards.keys()]);
  const knownChars = getKnownChars(knownCards, knownGraphs);

  const analysis: ImportAnalysis = JSON.parse(theImport.analysis);
  const allWords: [string, number][] = [];
  let nbUniqueWords = 0;
  let nbTotalWords = 0;
  let allChars = "";

  for (const [nbOccurances, wordList] of Object.entries(analysis.vocabulary.buckets)) {
    allWords.push(
      ...wordList.map((word: string) => [word, parseInt(nbOccurances)] as [string, number]),
    );
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

  return {
    successChars,
    successWords,
    nbTotalCharacters,
    nbTotalWords,
    nbUniqueCharacters,
    nbUniqueWords,
  };
}

function getSuccessWords(
  knownCards: Map<string, CardType>,
  knownGraphs: Map<string, string>,
  allWordsMap: Map<string, number>,
): FirstSuccess[] {
  const successWords: FirstSuccess[] = [];
  for (const [wordId, card] of knownCards.entries()) {
    const graph = knownGraphs.get(wordId);
    const nbOccurrences = allWordsMap.get(graph || "");
    if (nbOccurrences) {
      successWords.push({
        // wordId: wordId,
        // graph: knownGraphs.get(wordId),
        firstSuccess: card.firstSuccessDate,
        nbOccurrences: nbOccurrences,
      });
    }
  }
  return successWords;
}

async function getFirstSuccessStatsForList(
  db: TranscrobesDatabase,
  listId: string,
): Promise<ListFirstSuccessStats> {
  const knownCards = await getKnownCards(db);
  const goalWordList = (await db.wordlists.findByIds([listId])).get(listId);

  if (!goalWordList) throw new Error("Invalid goal, no userList found");

  const allListGraphs = await getGraphs(db, goalWordList.wordIds);
  let allChars = "";

  const knownGraphs = await getGraphs(db, [...knownCards.keys()]);
  for (const graph of allListGraphs.values()) {
    allChars += graph;
  }
  const nbUniqueWords = goalWordList.wordIds.length;
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

  return {
    successChars,
    successWords,
    nbUniqueCharacters,
    nbUniqueWords,
  };
}

async function getCardWords(db: TranscrobesDatabase): Promise<DayCardWords> {
  // FIXME:
  // Is this the best way to do this?
  // Basically, there are three states:
  // "new": in the list to learn but not seen yet, so we want it translated
  // "learning": in the list to learn and we sort of know/have started learning, so we don't want it translated
  // "known": we know it, so we don't want to have it in active learning, and we don't want it translated

  const allCardWordIds = Array.from(
    new Set((await db.cards.find().exec()).flatMap((x) => x.wordId())),
  );

  // If we have at least one card with an interval greater than zero,
  // it is considered "known" (here meaning simply "we don't want it translated in content we're consuming")
  const knownWordIds = new Set<string>(
    (
      await db.cards
        .find({
          selector: { $or: [{ known: { $eq: true } }, { interval: { $gt: 0 } }] },
        })
        .exec()
    ).flatMap((x) => x.wordId()),
  );

  const allCardWords = await db.definitions.findByIds(allCardWordIds);
  const allCardWordGraphs = new Set<string>();
  const knownCardWordGraphs = new Set<string>();
  for (const [wordId, word] of allCardWords) {
    allCardWordGraphs.add(word.graph);
    if (knownWordIds.has(wordId)) {
      knownCardWordGraphs.add(word.graph);
    }
  }

  return {
    knownCardWordGraphs: knownCardWordGraphs,
    allCardWordGraphs: allCardWordGraphs,
    knownWordIdsCounter: pythonCounter(knownWordIds),
  };
}

async function enrich(db: TranscrobesDatabase, contentId: string): Promise<string> {
  const content = await db.contents.findOne().where("id").eq(contentId).exec();
  if (!content) {
    console.error("Unable to find content for updating", contentId);
    return "failure";
  }
  await content.atomicPatch({ processing: PROCESSING.REQUESTED });
  console.debug("Updated content > processing: PROCESSING.REQUESTED", content);
  return "success";
}

async function saveSurvey(
  db: TranscrobesDatabase,
  surveyId: string,
  dataValue: string,
): Promise<string> {
  const userSurvey = await db.usersurveys.findOne().where("surveyId").eq(surveyId).exec();
  if (userSurvey && isRxDocument(userSurvey)) {
    // It's an update
    await userSurvey.atomicPatch({
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

async function getWordListWordIds(db: TranscrobesDatabase, wordListId: string): Promise<string[]> {
  const wordList = await db.wordlists.findByIds([wordListId]);
  return wordList.has(wordListId) ? wordList.get(wordListId)!.wordIds : [];
}

async function getDefaultWordLists(db: TranscrobesDatabase): Promise<SelectableListElementType[]> {
  return [...(await db.wordlists.find().exec())].map((x) => {
    return { label: x.name, value: x.id, selected: x.default };
  });
}

async function getUserListWords(db: TranscrobesDatabase): Promise<{
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

async function getWordDetails(db: TranscrobesDatabase, graph: string): Promise<WordDetailsRxType> {
  const localDefinition = await db.definitions.find().where("graph").eq(graph).exec();
  if (localDefinition.length > 0) {
    const word = localDefinition.values().next().value as DefinitionDocument;
    const cardIds = (
      await db.cards.storageInstance.internals.pouch.allDocs({
        startkey: `${word.id}-`,
        endkey: `${word.id}-\uffff`,
      })
    ).rows.map((x: CardType) => x.id);
    const cards = await db.cards.findByIds(cardIds);
    const wordModelStats = [...(await db.word_model_stats.findByIds([word.id])).values()][0];
    const characters = await getCharacterDetails(db, graph.split(""));

    return { word, cards, characters, wordModelStats };
  }
  return {
    word: null,
    cards: new Map<string, CardDocument>(),
    characters: new Map<string, CharacterDocument>(),
    wordModelStats: null,
  };
}

async function getCharacterDetails(
  db: TranscrobesDatabase,
  graphs: string[],
): Promise<Map<string, CharacterDocument>> {
  return await db.characters.findByIds(graphs);
}

async function createCards(
  db: TranscrobesDatabase,
  newCards: CardType[],
): Promise<{ success: CardDocument[]; error: RxStorageBulkWriteError<CardType>[] }> {
  return await db.cards.bulkInsert(newCards);
}

async function getDefinitions(
  db: TranscrobesDatabase,
  ids: string[],
): Promise<Map<string, DefinitionDocument>> {
  return await db.definitions.findByIds(ids);
}

async function getWordFromDBs(
  db: TranscrobesDatabase,
  word: string,
): Promise<DefinitionDocument | null> {
  const wordObj = await db.definitions.findOne().where("graph").eq(word).exec();
  return wordObj;
}

async function getContentConfigFromStore(
  db: TranscrobesDatabase,
  contentId: number,
): Promise<ContentConfigType> {
  const dbValue = await db.content_config.findOne(contentId.toString()).exec();
  const returnVal = dbValue ? JSON.parse(dbValue.configString || "{}") : {};
  return returnVal;
}

async function setContentConfigToStore(
  db: TranscrobesDatabase,
  contentConfig: ContentConfigType,
): Promise<boolean> {
  await db.content_config.upsert({
    id: contentConfig.id.toString(),
    configString: JSON.stringify(contentConfig),
  });
  // FIXME: what about false?
  return true;
}

// FIXME: userStatsMode should be an enum
// remove lemmaAndContexts any
async function submitLookupEvents(
  db: TranscrobesDatabase,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  lemmaAndContexts: any,
  userStatsMode: number,
  source: string,
): Promise<boolean> {
  const events = [];
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
async function submitUserEvents(db: TranscrobesDatabase, eventData: any): Promise<boolean> {
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

async function addOrUpdateCardsForWord(
  db: TranscrobesDatabase,
  wordId: string,
  grade: number,
): Promise<CardDocument[]> {
  const cards = [];
  for (const cardType of $enum(CARD_TYPES).getValues()) {
    const cardId = `${wordId}${CARD_ID_SEPARATOR}${cardType}`;
    const existing = await db.cards.findOne(cardId).exec();
    cards.push(await practiceCard(db, existing || { id: cardId }, grade, 0)); // Promise.all?
  }
  return cards;
}

// FIXME: any, this will require not using the isRxDocument and being clean
async function practiceCard(
  db: TranscrobesDatabase,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  currentCard: any,
  grade: number,
  badReviewWaitSecs: number,
): Promise<CardDocument> {
  const isCardDoc = isRxDocument(currentCard) && "toJSON" in currentCard;
  const cardToSave = practice(
    isCardDoc ? currentCard.toJSON() : currentCard,
    grade,
    badReviewWaitSecs,
  );
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
    await currentCard.atomicPatch(newValues);
  } else {
    if (!cardToSave.firstRevisionDate) {
      cardToSave.firstRevisionDate = newDate;
    }
    cardToSave.lastRevisionDate = newDate;
    cardObject = await db.cards.upsert(cardToSave);
  }
  return cardObject;
}

async function practiceCardsForWord(
  db: TranscrobesDatabase,
  practiceDetails: PracticeDetailsType,
): Promise<void> {
  const wordInfo = practiceDetails.wordInfo;
  const grade = practiceDetails.grade;

  const existing = await db.cards.findByIds(
    $enum(CARD_TYPES)
      .getValues()
      .map((cardType) => `${wordInfo.id}${CARD_ID_SEPARATOR}${cardType}`),
  );

  for (const cardType of $enum(CARD_TYPES).getValues()) {
    const cardId = `${wordInfo.id}${CARD_ID_SEPARATOR}${cardType}`;
    const card = existing.has(cardId) ? existing.get(cardId) : { id: cardId };
    await practiceCard(db, card, grade, 0); // here failureSeconds doesn't really have meaning
  }
}

async function getVocabReviews(
  db: TranscrobesDatabase,
  graderConfig: GraderConfig,
): Promise<VocabReview[] | null> {
  const selectedLists = graderConfig.wordLists.filter((x) => x.selected).map((x) => x.value);
  if (selectedLists.length === 0) {
    console.log("no wordLists, not trying to find stuff");
    return null;
  }
  const wordListObjects = (await db.wordlists.findByIds(selectedLists)).values();
  const potentialWordIds = [...new Set<string>([...wordListObjects].flatMap((x) => x.wordIds))];
  const existingWords = new Set<string>((await db.cards.find().exec()).flatMap((x) => x.wordId()));

  const potentialWordsMap = await db.definitions.findByIds(potentialWordIds);
  let potentialWords: DefinitionDocument[]; //  = [...potentialWordsMap.values()].filter(x => !existingWords.has(x.wordId));

  if (graderConfig.forceWcpm) {
    potentialWords = [...potentialWordsMap.values()]
      .filter((x) => !existingWords.has(x.id))
      .sort(sortByWcpm);
  } else {
    // TODO: this ordering is a bit arbitrary. If there is more than one list that has duplicates then
    // I don't know which version gets ignored, though it's likely the second. Is this what is wanted?
    potentialWords = [...potentialWordIds]
      .map((x) => potentialWordsMap.get(x))
      .filter((x) => x && !existingWords.has(x.id)) as DefinitionDocument[];
  }

  return potentialWords
    .slice(0, graderConfig.itemsPerPage)
    .filter((x) => !!x)
    .map((x) => {
      return {
        id: x.id,
        graph: x.graph,
        sound: x.sound,
        meaning: x.providerTranslations ? shortMeaning(x.providerTranslations) : "",
        clicks: 0,
        lookedUp: false,
      };
    });
}

async function getSRSReviews(
  db: TranscrobesDatabase,
  activityConfig: RepetrobesActivityConfigType,
): Promise<DailyReviewsType> {
  const selectedLists = activityConfig.wordLists.filter((x) => x.selected).map((x) => x.value);
  if (selectedLists.length === 0) {
    console.log("No wordLists, not trying to find stuff");
    return {
      todaysWordIds: new Set<string>(), // Set of words reviewed today already: string ids
      allNonReviewedWordsMap: new Map<string, DefinitionDocument>(), // Map of words in selected lists not already reviewed today
      existingCards: new Map<string, CardDocument>(), // Map of all cards reviewed at least once
      existingWords: new Map<string, DefinitionDocument>(), // Map of all words which have had at least one card reviewed at least once
      potentialWords: [] as DefinitionDocument[], // Array of words that can be "new" words today
      allPotentialCharacters: new Map<string, CharacterDocument>(), // Map of all individual characters that are in either possible new words or revisions for today
    };
  }

  // words already seen/reviewed "today"
  const todaysWordIds = new Set<string>(
    (
      await db.cards
        .find()
        .where("lastRevisionDate")
        .gt(dayjs().startOf("hour").hour(activityConfig.dayStartsHour).unix())
        .where("firstRevisionDate")
        .gt(0)
        .exec()
    ).flatMap((x) => x.wordId()),
  );

  const potentialWordIds = new Set<string>(
    [...(await db.wordlists.findByIds(selectedLists)).values()]
      .flatMap((x) => x.wordIds)
      .filter((x) => !todaysWordIds.has(x)),
  );
  const allNonReviewedWordsMap: Map<string, DefinitionDocument> = await db.definitions.findByIds([
    ...potentialWordIds,
  ]);
  const allKnownWordIds = new Set<string>(
    [...(await db.cards.find().where("known").eq(true).exec())].map((x) => x.wordId()),
  );
  //
  const existingCards = new Map<string, CardDocument>(
    (await db.cards.find().where("firstRevisionDate").gt(0).exec())
      // .filter((c) => potentialWordIds.has(c.wordId()))
      .map((c) => [c.id, c]),
  );
  console.debug(`existingCards at start`, existingCards);
  const existingWords: Map<string, DefinitionDocument> = await db.definitions.findByIds(
    [...existingCards.values()].map((x) => x.wordId()),
  );

  // TODO: this ordering is a bit arbitrary. If there is more than one list that has duplicates then
  // I don't know which version gets ignored, though it's likely the second. Is this what is wanted?
  const potentialWords: DefinitionDocument[] = [...allNonReviewedWordsMap.values()].filter(
    (x) => !existingWords.has(x.id) && !allKnownWordIds.has(x.id) && simpOnly(x.graph),
  );
  if (activityConfig.forceWcpm) {
    potentialWords.sort(sortByWcpm);
  }
  const allPotentialCharacters: Map<string, CharacterDocument> = await db.characters.findByIds([
    ...new Set(
      potentialWords
        .concat([...existingWords.values()])
        .map((x) => x.graph)
        .join(""),
    ),
  ]);

  return {
    todaysWordIds, // Set of words reviewed today already
    allNonReviewedWordsMap, // Map of words in selected lists not already reviewed today
    existingCards, // Map of all cards reviewed at least once
    existingWords, // Map of all words which have had at least one card reviewed at least once
    potentialWords, // Array of words that can be "new" words today
    allPotentialCharacters, // Map of all individual characters that are in either possible new words or revisions for today
  };
}

export {
  getFirstSuccessStatsForList,
  getFirstSuccessStatsForImport,
  getCardWords,
  sendUserEvents,
  getNamedFileStorage,
  pushFiles,
  saveSurvey,
  enrich,
  getKnownWordIds,
  getAllFromDB,
  getDefaultWordLists,
  getUserListWords,
  getWordListWordIds,
  getWordDetails,
  getCharacterDetails,
  createCards,
  getDefinitions,
  getWordFromDBs,
  getContentConfigFromStore,
  setContentConfigToStore,
  submitLookupEvents,
  submitUserEvents,
  addOrUpdateCardsForWord,
  practice,
  practiceCard,
  practiceCardsForWord,
  getVocabReviews,
  getSRSReviews,
};
