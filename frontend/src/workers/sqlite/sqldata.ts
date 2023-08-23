import dayjs from "dayjs";
import _ from "lodash";
import LZString from "lz-string";
import { toEnrich } from "../../lib/funclib";
import { cleanAnalysis, cleanedSound, fetchPlusResponse } from "../../lib/libMethods";
import {
  AnalysisAccuracy,
  CalculatedContentStats,
  CalculatedContentValueStats,
  CardCacheType,
  CardType,
  CharacterType,
  DayModelStatsType,
  DefinitionState,
  DefinitionType,
  FirstSuccess,
  GraderConfig,
  ImportAnalysis,
  ImportFirstSuccessStats,
  ImportWordType,
  InputLanguage,
  KnownWords,
  ListFirstSuccessStats,
  Participants,
  PersonType,
  PythonCounter,
  RawCharacterType,
  RawDefinitionType,
  RawUserDefinitionType,
  SelectableListElementType,
  SerialisableStringSet,
  SortableListElementType,
  UserDefinitionType,
  VocabReview,
  WordDetailsType,
  WordModelStatsType,
  WordlistType,
} from "../../lib/types";
import { cardToCardsCache, rowToResult, sqlResultsToObjects } from "../common-db";
import { getCardId } from "../rxdb/Schema";
import { getPracticeCard } from "./srsdata";
import { SQLiteResults, TagFunction } from "./tag";

export const managedTables = {
  Definitions: null,
  word_model_stats: null,
  day_model_stats: null,
  Cards: null,
  Userdictionaries: null,
  Imports: null,
  Userlists: null,
  Wordlists: null,
};

export type ManagedTable = keyof typeof managedTables;

const isUIThread = () => globalThis.window === self && globalThis.document;
/* Predicate for tests/groups. */
const isWorker = () => !isUIThread();

const hasOpfs = () => {
  return (
    globalThis.FileSystemHandle &&
    globalThis.FileSystemDirectoryHandle &&
    globalThis.FileSystemFileHandle &&
    // @ts-ignore
    globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle &&
    navigator?.storage?.getDirectory
  );
};

let tagFunction: TagFunction;
export function setTagfunction(executeParam: TagFunction) {
  tagFunction = executeParam;
}

// TODO: maybe improve...
// This queue is used to ensure that only one operation is running at a time.
// When using the DataManager as a proxy, this is done automatically. Unfortunately,
// the way comlink works, you can't use the DataManager as a proxy, so we have to
// do it manually again. This is very cheap in js, so doing it twice on the web isn't
// a big deal and keeps the system in place for other uses.
class PromiseQueue {
  queue: Promise<any> = Promise.resolve();
  add(operation) {
    return new Promise<SQLiteResults[]>((resolve, reject) => {
      this.queue = this.queue.then(operation).then(resolve).catch(reject);
    });
  }
}
const pq = new PromiseQueue();

export async function execute(sql: string, values?: SQLiteCompatibleType[][]): Promise<SQLiteResults[]> {
  const output = await pq.add(async () => {
    const out = await tagFunction(sql, values);
    return out;
  });

  return output;
}

async function executeSql(sql: string, values?: SQLiteCompatibleType[][]): Promise<SQLiteResults[]> {
  const output = await execute(sql, values);
  return output;
}

export async function getTableLastUpdate(tableName: ManagedTable): Promise<{ id?: string; date?: number }> {
  const lastUpdate = await execute(
    `SELECT id, max(updated_at) FROM ${tableName} GROUP BY id ORDER BY updated_at DESC, id DESC LIMIT 1;`,
  );
  const id = lastUpdate[0].rows?.[0]?.[0] as string;
  const date = lastUpdate[0].rows?.[0]?.[1] as number;
  return { id, date };
}

export async function getCardTableLastUpdate(): Promise<{ id?: string; date: number }> {
  const lastUpdate = await execute(
    `SELECT word_id, card_type, max(updated_at) FROM cards GROUP BY word_id, card_type ORDER BY updated_at DESC, word_id DESC, card_type DESC LIMIT 1;`,
  );
  const wordId = lastUpdate[0].rows?.[0]?.[0] as string;
  const cardType = lastUpdate[0].rows?.[0]?.[1] as number;
  const date = lastUpdate[0].rows?.[0]?.[2] as number;
  // here we just get all the cards for the same most recently updated word
  return { id: wordId && cardType ? getCardId(wordId, cardType) : undefined, date };
}

export async function getLatestUpdates(
  baseUrl: string,
  tableName: ManagedTable,
  { id, date }: { id?: string; date?: number },
) {
  const siteOrigin = new URL(baseUrl).origin;
  if (!baseUrl || !siteOrigin) throw new Error("No baseUrl");
  const res = await fetchPlusResponse(`${siteOrigin}/api/v1/tables/${tableName}/${id ?? "null"}/${date ?? -1}`);
  const data = await res.json();
  return data;
}

export async function forceDefinitionsSync(baseUrl: string) {
  const defUpdates = (await getLatestUpdates(baseUrl, "Definitions", await getTableLastUpdate("Definitions")))[
    "Definitions"
  ];
  if (defUpdates?.length > 0) {
    await genericTableUpsert("Definitions", defUpdates, ["id"]);
  } else {
    console.warn("No updates for Definitions");
  }
}

export async function getKnownWords(): Promise<KnownWords> {
  const out = await execute(`
    SELECT def.graph
    FROM definitions def INDEXED BY idx_definitions_id_graph
    inner join known_words kw on kw.id = def.id
    `);
  if (!out[0]?.rows?.length) return { knownWordGraphs: {} };

  const knownWordGraphs: SerialisableStringSet = {};
  for (const row of out[0].rows) {
    knownWordGraphs[row[0] as string] = null;
  }
  return { knownWordGraphs };
}

export async function syncUserDictionaryUpdates(latestUpdates: { id: string; updatedAt: number; lzContent: string }[]) {
  for (const { id, updatedAt, lzContent } of latestUpdates) {
    genericTableUpsert("userdictionaries", [{ id, updatedAt }], ["id"]);

    const dictEntries = JSON.parse(LZString.decompressFromUTF16(lzContent) || "{}") as Record<
      string,
      UserDefinitionType
    >;
    await refreshDictionaryWords(
      Object.values(dictEntries).map((d) => ({
        id: d.id,
        dictionaryId: id,
        translations: JSON.stringify(d.translations),
        sounds: d.sounds ? JSON.stringify(d.sounds) : undefined,
      })),
    );
  }
}

// FIXME: updated_at horribleness!!!
export async function syncImportUpdates(latestUpdates: { id: string; updated_at: number; analysis: string }[]) {
  for (const { id, updated_at, analysis } of latestUpdates) {
    if (analysis && Object.keys(analysis).length > 0) {
      const parsed = JSON.parse(analysis) as ImportAnalysis;
      const importWords: ImportWordType[] = [];
      const wordss: Record<string, number> = {};
      for (const [nb_occurrences, words] of Object.entries(parsed.vocabulary.buckets)) {
        for (const word of words) {
          wordss[word] = parseInt(nb_occurrences);
        }
      }
      const wordIds = await getDefinitionIdsFromGraphs(Object.keys(wordss));
      for (const { wordId, graph } of wordIds) {
        importWords.push({ graph, importId: id, nbOccurrences: wordss[graph], wordId });
      }
      await refreshImportWords(importWords);

      await genericTableUpsert(
        "Imports",
        [{ id, updated_at, sentenceLengths: parsed.sentenceLengths ? JSON.stringify(parsed.sentenceLengths) : null }],
        ["id"],
      );
    }
  }
}

// FIXME: this is a temp hack that can leave the db in an inconsistent state
// it would be better to manage the tag function with the ability to manually manage transactions
// which would mean that we don't get failed transactions that leave the db in a bad state
async function genericTableUpsert(tableName: string, values: any[], pkColumns: string[] = ["id"]) {
  if (!values.length) return;

  const fields = Object.keys(values[0]);
  const snakeFields = fields.map((x) => _.snakeCase(x));
  let sqlInsert = `
  INSERT INTO ${tableName}
  (${snakeFields.join(",")})
  VALUES `;
  let sqlConflict = `
    ON CONFLICT(${pkColumns.map((x) => _.snakeCase(x)).join(",")})
    DO UPDATE
    SET
    ${snakeFields.map((x) => x + "=excluded." + x).join(",")}
    `;

  let buffer: any = [];
  let i = 0;
  while (true) {
    // 32766 is the max params for sqlite3
    if (fields.length + buffer.length * fields.length >= 32765 || i >= values.length) {
      if (buffer.length > 0) {
        const sql = sqlInsert + buffer.map(() => `(${fields.map(() => "?").join(",")})`).join(",") + sqlConflict;
        await execute(sql, [buffer.flat()]);
        buffer = [];
      }
      if (i >= values.length) break;
    }
    const row: any[] = [];
    for (const field of fields) {
      const val = values[i][field];
      row.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
    }
    buffer.push(row);
    i++;
  }
}

export async function syncCardUpdates(inCards: CardType[] | CardCacheType[]) {
  let cards: CardCacheType[] = [];
  if (inCards.length === 0) {
    return;
  } else {
    if ("id" in inCards[0]) {
      for (const card of inCards) {
        cards.push(cardToCardsCache(card as CardType));
      }
    } else {
      cards = inCards as CardCacheType[];
    }
  }
  await genericTableUpsert("cards", cards, ["wordId", "cardType"]);
}

// FIXME: camel vs snake horribleness
export async function syncWordlistUpdates({
  id,
  name,
  is_default,
  updated_at,
  word_ids,
}: {
  id: string;
  name: string;
  is_default: boolean;
  updated_at: number;
  word_ids: string[];
}) {
  await genericTableUpsert("Wordlists", [{ id, name, is_default, updated_at }], ["id"]);
  await refreshWordlistIds(id, word_ids);
}

// FIXME: any
export async function syncWordModelStats(updates: any[]) {
  await genericTableUpsert("word_model_stats", updates, ["id"]);
}

// FIXME: any
export async function syncDayModelStats(updates: any[]) {
  await genericTableUpsert("day_model_stats", updates, ["id"]);
}

async function refreshWordlistIds(listId: string, wordIds: string[]) {
  // FIXME: better done in a single transaction...
  let sql = `
    DELETE FROM list_words
    WHERE list_id = ?
  `;
  await execute(sql, [[listId]]);

  // sql = `INSERT INTO list_words ##COLUMNS## values ##ROWS##`;

  // export async function executeUpsertSqlBatch(tableName: string, values: any[], pkColumns: string[]) {
  await genericTableUpsert(
    "list_words",
    wordIds.map((x, i) => {
      return { listId, wordId: parseInt(x), defaultOrder: i };
    }),
    ["list_id", "word_id"],
  );
}

async function getDefinitionIdsFromGraphs(graphs: string[]) {
  let sql = `select id, graph from definitions where graph in (${graphs.map(() => "?").join(", ")})`;
  const output = await execute(sql, [graphs]);
  const out: { wordId: number; graph: string }[] = [];
  for (const row of output[0].rows) {
    out.push({ wordId: row[0] as number, graph: row[1] as string });
  }
  return out;
}

function rawCharacterToObject(rawChar?: RawCharacterType) {
  if (!rawChar) return null;
  return {
    id: rawChar.id,
    pinyin: JSON.parse(rawChar.pinyin),
    decomposition: JSON.parse(rawChar.decomposition),
    radical: JSON.parse(rawChar.radical),
    etymology: rawChar.etymology ? JSON.parse(rawChar.etymology) : undefined,
    structure: JSON.parse(rawChar.structure),
    updatedAt: rawChar.updatedAt,
  };
}

function rawDefinitionToObject(raw: RawDefinitionType): DefinitionType {
  return {
    id: raw.id,
    graph: raw.graph,
    sound: JSON.parse(raw.sound),
    synonyms: JSON.parse(raw.synonyms),
    providerTranslations: JSON.parse(raw.providerTranslations),
    frequency: { pos: raw.pos, posFreq: raw.posFreq, wcdp: raw.wcdp?.toString(), wcpm: raw.wcpm?.toString() },
    hsk: JSON.parse(raw.hsk),
    updatedAt: raw.updatedAt,
    fallbackOnly: raw.fallbackOnly,
  };
}

function rowToDefinitionState(row: SQLiteCompatibleType[]): DefinitionState {
  return {
    id: row[0] as string,
    graph: row[1] as string,
    sound: JSON.parse(row[2] as string),
    synonyms: JSON.parse(row[3] as string),
    providerTranslations: JSON.parse(row[4] as string),
    frequency: {
      pos: row[5] as string,
      posFreq: row[6] as string,
      wcdp: (row[7] as string)?.toString(),
      wcpm: (row[8] as string)?.toString(),
    },
    hsk: row[9] ? JSON.parse(row[9] as string) : undefined,
    fallbackOnly: !!row[10],
    updatedAt: row[11] as number,
    ignore: !!row[12],
    firstSuccessDate: row[13] as number,
    glossToggled: false,
  };
}

export async function getDefinitions({
  column,
  values,
}: {
  column: string;
  values: string[];
}): Promise<DefinitionState[]> {
  if (!column || !values || values.length === 0) {
    console.log("No values provided", column, values);
    throw new Error("No values provided");
  }
  let sql = `select def.*, kw.ignore, kw.first_success_date, uds.*
   from definitions def
   left join known_words kw on def.id = kw.id
   left join user_definitions uds on def.graph = uds.id
  `;
  if (column && values && values.length > 0) {
    sql += ` where def.${column} in (${values.map(() => "?").join(", ")})`;
  }
  const output = await execute(sql, values ? [column === "id" ? values.map((x) => parseInt(x)) : values] : undefined);

  const rows = output[0].rows;
  const columns = output[0].columns;
  const defs = new Map<number, DefinitionState>();
  for (let i = 0; i < rows.length; i++) {
    const word_id = rows[i][0] as number;
    if (!defs.has(word_id)) {
      defs.set(word_id, rowToDefinitionState(rows[i]));
    }
    if (rows[i].length > 14 && rows[i][14]) {
      const rawUserDef = rowToResult(columns.slice(14), rows[i].slice(14));
      defs.get(word_id)?.providerTranslations.push({
        provider: rawUserDef.dictionaryId,
        posTranslations: JSON.parse(rawUserDef.translations),
      });
    }
  }
  return [...defs.values()];
}

export async function getCharacterDetails(characterGraphs: string[]): Promise<(CharacterType | null)[]> {
  const rawChars: RawCharacterType[] = await getByIds("characters", characterGraphs);
  const outChars: (CharacterType | null)[] = [];
  for (const rc of characterGraphs) {
    outChars.push(rawCharacterToObject(rawChars.find((x) => x.id === rc)));
  }
  return outChars;
}

// @ts-ignore
async function getPersons(column?: string, values?: string[]): Promise<PersonType[]> {
  throw new Error("Not implemented");
}

async function getImportUtilityStatsForList({
  importId,
  userlistId,
  fromLang,
}: {
  importId: string;
  userlistId: string;
  fromLang: InputLanguage;
}): // @ts-ignore
Promise<CalculatedContentValueStats | null> {
  // const theImport = (await db.imports.findByIds([importId]).exec()).get(importId);
  // if (!theImport?.analysis || theImport.analysis.length === 0) return null;
  // const analysis: ImportAnalysis = JSON.parse(theImport.analysis);
  // const wordlist = (await db.wordlists.findByIds([userlistId]).exec()).get(userlistId)?.wordIds;
  // const defs = new Set<string>();
  // // for (const def of (await db.definitions.findByIds(wordlist || []).exec()).values()) {
  // for (const def of await getDefinitions("id", wordlist || [])) {
  //   defs.add(def.graph);
  // }
  // const buckets = cleanAnalysis(analysis, fromLang);
  // const foundWords: PythonCounter = {};
  // const notFoundWords: PythonCounter = {};
  // const knownFoundWords: PythonCounter = {};
  // const knownNotFoundWords: PythonCounter = {};
  // let unknownFoundWordsTotalTokens: number = 0;
  // let unknownNotFoundWordsTotalTokens: number = 0;
  // let knownFoundWordsTotalTokens: number = 0;
  // let knownNotFoundWordsTotalTokens: number = 0;
  // for (const [nbOccurences, words] of Object.entries(buckets)) {
  //   for (const word of words) {
  //     if (defs.has(word)) {
  //       if (word in cardWords.knownCardWordGraphs) {
  //         knownFoundWords[word] = parseInt(nbOccurences);
  //         knownFoundWordsTotalTokens += parseInt(nbOccurences);
  //       } else {
  //         foundWords[word] = parseInt(nbOccurences);
  //         unknownFoundWordsTotalTokens += parseInt(nbOccurences);
  //       }
  //     } else {
  //       if (word in cardWords.knownCardWordGraphs) {
  //         knownNotFoundWords[word] = parseInt(nbOccurences);
  //         knownNotFoundWordsTotalTokens += parseInt(nbOccurences);
  //       } else {
  //         notFoundWords[word] = parseInt(nbOccurences);
  //         unknownNotFoundWordsTotalTokens += parseInt(nbOccurences);
  //       }
  //     }
  //   }
  // }
  // return {
  //   unknownFoundWordsTotalTypes: Object.keys(foundWords || {}).length,
  //   unknownNotFoundWordsTotalTypes: Object.keys(notFoundWords || {}).length,
  //   knownFoundWordsTotalTypes: Object.keys(knownFoundWords || {}).length,
  //   knownNotFoundWordsTotalTypes: Object.keys(knownNotFoundWords || {}).length,
  //   unknownFoundWordsTotalTokens,
  //   unknownNotFoundWordsTotalTokens,
  //   knownFoundWordsTotalTokens,
  //   knownNotFoundWordsTotalTokens,
  // };
}

// @ts-ignore
async function getContentAccuracyStatsForImport({
  importId,
  analysisString,
  allWordsInput,
  fromLang,
}: {
  importId?: string;
  analysisString?: string;
  allWordsInput?: PythonCounter;
  fromLang: InputLanguage;
  // @ts-ignore
}): Promise<AnalysisAccuracy | null> {
  // const defs = new Map<string, DefinitionType>();
  // // for (const def of await db.definitions.find().exec()) {
  // for (const def of await getDefinitions()) {
  //   defs.set(def.graph, def);
  // }
  // const allWords: DictionaryCounter = {};
  // if (allWordsInput) {
  //   for (const [word, nbOccurrences] of Object.entries(allWordsInput)) {
  //     allWords[word] = [defs.get(word)?.id || "", nbOccurrences];
  //   }
  // } else {
  //   let analysis: ImportAnalysis;
  //   if (analysisString) {
  //     analysis = JSON.parse(analysisString);
  //   } else if (importId) {
  //     const theImport = (await db.imports.findByIds([importId]).exec()).get(importId);
  //     if (!theImport?.analysis || theImport.analysis.length === 0) return null;
  //     analysis = JSON.parse(theImport.analysis);
  //   } else {
  //     throw new Error("At least one of importId or analysisString must be provided");
  //   }
  //   const buckets = cleanAnalysis(analysis, fromLang);
  //   for (const [nbOccurrences, wordList] of Object.entries(buckets)) {
  //     for (const word of wordList) {
  //       allWords[word] = [defs.get(word)?.id || "", parseInt(nbOccurrences)];
  //     }
  //   }
  // }
  // const foundWords: PythonCounter = {};
  // const notFoundWords: PythonCounter = {};
  // const knownFoundWords: PythonCounter = {};
  // const knownNotFoundWords: PythonCounter = {};
  // for (const [word, [, nbOccurances]] of Object.entries(allWords)) {
  //   const def = defs.get(word);
  //   let found = false;
  //   if (def) {
  //     for (const prov of def.providerTranslations) {
  //       if (prov.provider !== "fbk" && prov.posTranslations.length > 0) {
  //         found = true;
  //         break;
  //       }
  //     }
  //   }
  //   if (found) {
  //     foundWords[word] = nbOccurances;
  //     if (word in cardWords.knownCardWordGraphs) {
  //       knownFoundWords[word] = nbOccurances;
  //     }
  //   } else {
  //     notFoundWords[word] = nbOccurances;
  //     if (word in cardWords.knownCardWordGraphs) {
  //       knownNotFoundWords[word] = nbOccurances;
  //     }
  //   }
  // }
  // return { allWords, foundWords, notFoundWords, knownFoundWords, knownNotFoundWords };
}

async function getKnownWordCount(includeIgnored?: boolean): Promise<number> {
  const out = await execute(`
    select count(0) from known_words
    ${!includeIgnored ? " WHERE not ignore " : ""}
    `);
  return out[0].rows[0][0] as number;
}

async function meanSentenceLengthForImport(importId: string): Promise<number> {
  const theimport = await execute(`select sentence_lengths from imports where id = ?;`, [[importId]]);
  const sentenceLengths = theimport[0]?.rows?.[0]?.[0] as string;
  const meanSentenceLength = sentenceLengths ? _.mean(JSON.parse(sentenceLengths)) : 0;
  return meanSentenceLength;
}

async function getStatsFromAnalysis({
  analysisString,
  fromLang,
  includeNonDict = false,
  includeIgnored = false,
}: {
  analysisString: string;
  fromLang: InputLanguage;
  includeNonDict?: boolean;
  includeIgnored?: boolean;
}): Promise<ImportFirstSuccessStats | null> {
  const analysis = JSON.parse(analysisString);
  const buckets = cleanAnalysis(analysis, fromLang);
  const wordOccurrences: Record<string, number> = {};
  for (const [nbOccurrences, wordList] of Object.entries(buckets)) {
    for (const word of wordList) {
      wordOccurrences[word] = parseInt(nbOccurrences);
    }
  }
  const tableName = `analysis_${dayjs().unix()}`;
  let sql = `CREATE TEMP TABLE ${tableName} (graph TEXT PRIMARY KEY, nb_occurrences INTEGER) STRICT;`;
  await execute(sql);
  await genericTableUpsert(
    tableName,
    Object.entries(wordOccurrences).map(([graph, nb_occurrences]) => {
      return { graph, nb_occurrences };
    }),
    ["graph"],
  );
  sql = `SELECT iw.graph, iw.nb_occurrences, ds2.first_success_date
    from ${tableName} iw
    ${!includeNonDict ? " inner join definitions def on iw.graph = def.graph and not def.fallback_only " : ""}
    ${!includeIgnored ? " left join known_words ds1 on def.id = ds1.id and ds1.ignore " : ""}
    left join known_words ds2 on def.id = ds2.id and ds2.first_success_date > 0
    ${!includeIgnored ? " and ds1.id is null " : ""};
    `;
  const outData = (await execute(sql))[0].rows as [string, number, number][];
  await execute(`DROP TABLE ${tableName};`);
  return {
    ...(await getFirstSuccessStatsFromStats(outData, fromLang)),
    meanSentenceLength: _.mean(analysis.sentenceLengths),
  };
}

async function getImportStats({
  importId,
  includeNonDict = false,
  includeIgnored = false,
}: {
  importId: string;
  includeNonDict?: boolean;
  includeIgnored?: boolean;
}): Promise<[string, number, number][]> {
  const sql = `SELECT iw.graph, iw.nb_occurrences, ds2.first_success_date
    from import_words iw
    ${!includeNonDict ? " inner join definitions def on iw.word_id = def.id and not def.fallback_only " : ""}
    ${!includeIgnored ? " left join known_words ds1 on iw.word_id = ds1.id and ds1.ignore " : ""}
    left join known_words ds2 on iw.word_id = ds2.id and ds2.first_success_date > 0
    ${!includeIgnored ? " and ds1.id is null " : ""}
    WHERE iw.import_id = ?`;
  return (await execute(sql, [[importId]]))[0].rows as [string, number, number][];
}

async function getWaitingRevisions(): Promise<CardType[]> {
  const sql = `
  SELECT *
    from cards cc
  WHERE cc.first_revision_date > 0
    and cc.due_date < unixepoch('now')
    and not cc.known
    order by cc.due_date asc`;
  return sqlResultsToObjects((await execute(sql))[0]);
}

async function getContentStatsForImport({
  fromLang,
  importId,
  includeNonDict = false,
  includeIgnored = false,
}: {
  fromLang: InputLanguage;
  importId: string;
  includeNonDict?: boolean;
  includeIgnored?: boolean;
}): Promise<CalculatedContentStats | null> {
  let [knownChars, knownWords, chars, words, knownWordsTypes, wordsTypes] = Array(6).fill(0);
  const charsTypesSet = new Set<string>();
  const knownCharsTypesSet = new Set<string>();
  const importWords = await getImportStats({ importId, includeNonDict, includeIgnored });
  for (const [graph, nbOccurences, firstSuccessDate] of importWords) {
    if (toEnrich(graph, fromLang)) {
      chars += graph.length * nbOccurences;
      words += nbOccurences;
      wordsTypes++;
      if (firstSuccessDate) {
        knownChars += graph.length * nbOccurences;
        knownWords += nbOccurences;
        knownWordsTypes++;
        for (const char of graph) {
          knownCharsTypesSet.add(char);
        }
      }
      for (const char of graph) {
        charsTypesSet.add(char);
      }
    }
  }
  return {
    fromLang,
    chars,
    knownChars,
    words,
    knownWords,
    wordsTypes,
    knownWordsTypes,
    meanSentenceLength: await meanSentenceLengthForImport(importId),
    charsTypes: charsTypesSet.size,
    knownCharsTypes: knownCharsTypesSet.size,
  };
}

async function getFirstSuccessStatsFromStats(stats: [string, number, number][], fromLang: InputLanguage) {
  let [nbTotalCharacters, nbTotalWords, nbUniqueWords] = Array(6).fill(0);
  let allChars = "";
  const successWords: FirstSuccess[] = [];
  const knownChars = new Map<string, [number, number]>();
  for (const [graph, nbOccurences, firstSuccessDate] of stats) {
    if (toEnrich(graph, fromLang)) {
      allChars += graph.repeat(nbOccurences);
      nbTotalCharacters += graph.length * nbOccurences;
      nbTotalWords += nbOccurences;
      nbUniqueWords++;
      successWords.push({
        firstSuccess: firstSuccessDate,
        nbOccurrences: nbOccurences,
      });
      if (firstSuccessDate && firstSuccessDate > 0) {
        for (const char of graph) {
          const first = knownChars.get(char);
          if (!first || first[0] > firstSuccessDate) {
            knownChars.set(char, [firstSuccessDate, (first?.[1] || 0) + nbOccurences]);
          } else {
            knownChars.set(char, [first[0], first[1] + nbOccurences]);
          }
        }
      }
    }
  }
  const uniqueListChars = new Set([...allChars]);
  const successChars: FirstSuccess[] = [];
  for (const [char, data] of knownChars.entries()) {
    successChars.push({
      firstSuccess: data[0],
      nbOccurrences: data[1],
    });
  }
  successChars.sort((a, b) => a.firstSuccess - b.firstSuccess);
  successWords.sort((a, b) => a.firstSuccess - b.firstSuccess);

  return {
    successChars,
    successWords,
    nbTotalWords,
    nbTotalCharacters,
    nbUniqueWords,
    nbUniqueCharacters: uniqueListChars.size,
  };
}

async function getFirstSuccessStatsForImport({
  importId,
  includeNonDict,
  includeIgnored,
  fromLang,
}: {
  importId: string;
  includeNonDict?: boolean;
  includeIgnored?: boolean;
  fromLang: InputLanguage;
}): Promise<ImportFirstSuccessStats | null> {
  const importWords = await getImportStats({ importId, includeNonDict, includeIgnored });
  const stats = await getFirstSuccessStatsFromStats(importWords, fromLang);
  const meanSentenceLength = await meanSentenceLengthForImport(importId);
  return { ...stats, meanSentenceLength };
}

async function getFirstSuccessStatsForList({
  listId,
  includeNonDict = false,
  includeIgnored = false,
}: {
  listId?: string;
  includeNonDict?: boolean;
  includeIgnored?: boolean;
}): Promise<ListFirstSuccessStats | null> {
  const sql = `
    select def.graph, ds2.first_success_date
    from definitions def
    ${listId ? "inner join list_words lw on lw.word_id = def.id and lw.list_id = ?" : ""}
    ${listId ? "left" : "inner"} join known_words ds2 on def.id = ds2.id and ds2.first_success_date > 0
    ${!includeNonDict ? "and not def.fallback_only" : ""}
    ${!includeIgnored ? "and not ds2.ignore" : ""}
  `;
  const out = await execute(sql, listId ? [[listId]] : undefined);
  if (!out) return null;
  const successWords: FirstSuccess[] = [];
  let allChars = "";
  let nbUniqueWords = 0;
  let knownWords = new Map<string, number>();
  for (const row of out[0].rows) {
    knownWords.set(row[0] as string, row[1] as number);
    allChars += row[0];
    nbUniqueWords++;
    successWords.push({
      firstSuccess: row[1] as number,
      nbOccurrences: 1,
    });
  }

  const knownChars = new Map<string, number>();
  for (const [graph, firstSuccessDate] of knownWords.entries()) {
    for (const char of graph) {
      const first = knownChars.get(char);
      if (!first || first > firstSuccessDate) {
        knownChars.set(char, firstSuccessDate);
      }
    }
  }

  const uniqueListChars = new Set([...allChars]);
  const nbUniqueCharacters = uniqueListChars.size;
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

async function getWordListWordCount(listId: string): Promise<number> {
  const count = await execute("SELECT COUNT(*) FROM list_words WHERE list_id = ?", [[listId]]);
  return count[0].rows[0][0] as number;
}

async function getUserDefinitionsForGraph({
  dictionaryIds,
  graph,
}: {
  dictionaryIds?: string[];
  graph: string;
}): Promise<[string, UserDefinitionType][]> {
  const sql = `
    SELECT id, dictionary_id, translations, sounds FROM user_definitions
    where id = ?
    ${
      dictionaryIds && dictionaryIds.length > 0
        ? " and dictionary_id in (" + dictionaryIds.map(() => "?").join(", ") + ")"
        : ""
    }
  `;
  const results = await execute(sql, [[graph, ...(dictionaryIds || [])]]);
  const rows = results[0].rows;
  const output: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    output.push([
      row[1],
      {
        id: row[0],
        translations: row[2] ? JSON.parse(row[2] as string) : undefined,
        sounds: row[3] ? JSON.parse(row[3] as string) : undefined,
      },
    ]);
  }
  return output;
}

async function getWordWordlists(wordId: number): Promise<SortableListElementType[]> {
  const sql = `
    SELECT list_id, name, default_order FROM list_words lw
    INNER JOIN wordlists wls ON lw.list_id = wls.id
    WHERE lw.word_id = ?
  `;
  const results = await execute(sql, [[wordId]]);
  const rows = results[0].rows;
  const output: SortableListElementType[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    output.push({
      listId: row[0] as string,
      name: row[1] as string,
      position: row[2] as number,
    });
  }
  return output;
}

async function getWordDetails({
  dictionaryIds,
  graph,
}: {
  dictionaryIds?: string[];
  graph: string;
}): Promise<WordDetailsType> {
  let cards: CardCacheType[] = [];
  let wordModelStats: WordModelStatsType | null = null;
  let wordlists: SortableListElementType[] = [];
  const word = (await getDefinitions({ column: "graph", values: [graph] }))[0];
  const userDefinitions = await getUserDefinitionsForGraph({ graph, dictionaryIds });

  let chars: (CharacterType | null)[] = [];
  if (word) {
    chars = await getCharacterDetails(graph.split(""));
    cards = await getByColumnValue("cards", "word_id", word.id);
    wordModelStats = (await getByColumnValue("word_model_stats", "id", word.id))[0];
    wordlists = await getWordWordlists(parseInt(word.id));
  }
  const safe: WordDetailsType = {
    wordlists,
    userDefinitions,
    word,
    cards,
    characters: chars,
    recentPosSentences: null,
    wordModelStats,
  };
  return safe;
}

async function refreshTempRecentSentenceIds(rcIds: number[]) {
  const sql = `
  drop table if exists tmp_recent_sentences;
  create table tmp_recent_sentences (
    id integer primary key
  );
  `;
  await execute(sql);
  await genericTableUpsert(
    "tmp_recent_sentences",
    rcIds.map((x) => ({ id: x })),
    ["id"],
  );
}

async function getWordsByGraphs(graphs: string[]): Promise<DefinitionType[]> {
  const rawDefs: RawDefinitionType[] = await getByColumnValues("definitions", "graph", graphs);
  return rawDefs.map((raw) => rawDefinitionToObject(raw));
}

async function getByColumnValues(tableName: string, columnName: string, values: (string | number)[]): Promise<any[]> {
  const out = await execute(
    `SELECT * FROM ${tableName} WHERE ${columnName} IN (${values.map(() => "?").join(", ")});`,
    [values],
  );
  if (!out[0]?.rows?.length) return [];
  return sqlResultsToObjects(out[0]);
}

async function getByColumnValue(tableName: string, columnName: string, value: string | number): Promise<any[]> {
  const sql = `SELECT * FROM ${tableName} WHERE ${columnName} = ?`;
  const out = await execute(sql, [[value]]);
  if (!out[0]?.rows?.length) return [];
  return sqlResultsToObjects(out[0]);
}

async function getAll(tableName: string): Promise<any[]> {
  const out = await execute(`SELECT * FROM ${tableName}`);
  if (!out[0]?.rows?.length) return [];
  return sqlResultsToObjects(out[0]);
}

async function getByIds(tableName: string, ids: (string | number)[]) {
  const sql = `SELECT * FROM ${tableName} WHERE id IN (${ids.map(() => "?").join(", ")});`;
  const out = await execute(sql, [ids]);
  if (!out[0]?.rows?.length) return [];
  return sqlResultsToObjects(out[0]);
}

async function getWordFromDBs(graph: string): Promise<DefinitionState | null> {
  const sql = `
  SELECT def.*, ds.ignore, ds.first_success_date
  FROM definitions def
  LEFT JOIN known_words ds ON ds.id = def.id
  WHERE def.graph = ?`;
  const out = await execute(sql, [[graph]]);
  return out[0]?.rows[0] ? rowToDefinitionState(out[0].rows[0]) : null;
}

async function getWordlist(listId: string): Promise<WordlistType | null> {
  return (await getByColumnValue("wordlists", "id", listId))[0];
}

async function getListKnownPercentages({
  listIds,
  includeIgnored = false,
  includeNonDict = false,
}: {
  listIds: string[];
  includeIgnored?: boolean;
  includeNonDict?: boolean;
}): Promise<{ [key: string]: { known: number; total: number } }> {
  const counts = await execute(
    `SELECT lw.list_id, count(lw.word_id), count(ds2.id)
    from list_words lw
    ${!includeNonDict ? " inner join definitions def on lw.word_id = def.id and not def.fallback_only " : ""}
    ${!includeIgnored ? " left join known_words ds1 on lw.word_id = ds1.id and ds1.ignore " : ""}
    left join known_words ds2 on lw.word_id = ds2.id and ds2.first_success_date > 0
    WHERE lw.list_id IN (${listIds.map(() => "?").join(", ")})
    ${!includeIgnored ? " and ds1.id is null " : ""}
    group by lw.list_id;`,
    [listIds],
  );
  const listWords: { [key: string]: { known: number; total: number } } = {};
  for (const row of counts[0].rows) {
    listWords[row[0] as string] = { known: row[2] as number, total: row[1] as number };
  }
  return listWords;
}

async function getVocabReviews({
  graderConfig,
  includeIgnored = false,
  includeNonDict = false,
}: {
  graderConfig: GraderConfig;
  includeIgnored?: boolean;
  includeNonDict?: boolean;
}): Promise<VocabReview[] | null> {
  const listIds = graderConfig.wordLists.filter((x) => x.selected).map((x) => x.value);
  if (listIds.length === 0) {
    console.debug("No wordLists, not trying to find reviews");
    return null;
  }

  let orderBy = "";
  let wmsJoin = "";
  if (graderConfig.itemOrdering === "WCPM") {
    orderBy = "def.wcpm desc";
  } else if (graderConfig.itemOrdering === "Personal") {
    orderBy = "wms.nb_seen desc";
    wmsJoin = "left join word_model_stats wms on lw.word_id = wms.id";
  } else {
    orderBy = "lw.list_id, lw.default_order";
  }

  const sql = `select distinct def.* from list_words lw
      inner join definitions def on lw.word_id = def.id
      ${!includeNonDict ? " and not def.fallback_only " : ""}
      ${includeIgnored ? " left join known_words ds1 on lw.word_id = ds1.id and ds1.ignore " : ""}
      left join known_words ds2 on lw.word_id = ds2.id and ds2.first_success_date > 0
      ${wmsJoin}
      where lw.list_id in (${listIds.map(() => "?").join(", ")}) and ds2.id is null
      ${includeIgnored ? " and ds1.id is null " : ""}
      order by
      ${orderBy}
      limit ?;`;

  const res = await execute(sql, [[...listIds, graderConfig.itemsPerPage]]);

  const defs = sqlResultsToObjects(res[0]);
  const vocabReviews: VocabReview[] = [];
  for (const x of defs) {
    vocabReviews.push({
      id: x.id,
      graph: x.graph,
      sound: cleanedSound({ ...x, sound: JSON.parse(x.sound) }, graderConfig.fromLang),
      providerTranslations: JSON.parse(x.providerTranslations),
      clicks: 0,
      lookedUp: false,
    });
  }
  return vocabReviews;
}

async function getDayStats(val?: { studentId?: number }): Promise<DayModelStatsType[]> {
  const sql = `
    SELECT *
    FROM ${val?.studentId ? "student_" : ""} day_model_stats dms
    ${val?.studentId ? " WHERE student_id = ? " : ""}
    ORDER BY id asc`;
  return sqlResultsToObjects((await execute(sql, val?.studentId ? [[val.studentId]] : undefined))[0]);
}

async function getDefaultWordLists(): Promise<SelectableListElementType[]> {
  return [...(await getAll("wordlists"))].map((x) => {
    return { label: x.name, value: x.id, selected: x.isDefault };
  });
}

async function getLanguageClassParticipants({
  classId,
  className,
}: {
  classId: string;
  className?: string;
}): // @ts-ignore
Promise<Participants> {
  // if (!className) {
  //   const classDoc = (await db.languageclasses.findByIds([classId]).exec()).get(classId);
  //   if (!classDoc) {
  //     throw new Error(`Class ${classId} not found`);
  //   }
  //   className = classDoc.title;
  // }
  // const teacherregistrations = await db.teacherregistrations
  //   .find({
  //     selector: { classId: { $eq: classId } },
  //   })
  //   .exec();
  // const studentregistrations = await db.studentregistrations
  //   .find({
  //     selector: { classId: { $eq: classId } },
  //   })
  //   .exec();
  // const teacherIds = new Map<string, TeacherRegistrationType>();
  // const studentIds = new Map<string, StudentRegistrationType>();
  // for (const registration of teacherregistrations) {
  //   teacherIds.set(registration.userId, registration);
  // }
  // for (const registration of studentregistrations) {
  //   studentIds.set(registration.userId, registration);
  // }
  // // const users = [...(await db.persons.findByIds([...teacherIds.keys(), ...studentIds.keys()]).exec()).values()];
  // const users = await getPersons("id", [...teacherIds.keys(), ...studentIds.keys()]);
  // const participants: Participants = {
  //   students: [],
  //   teachers: [],
  // };
  // for (const user of [...users]) {
  //   if (teacherIds.has(user.id)) {
  //     participants.teachers.push({
  //       id: teacherIds.get(user.id)!.id,
  //       className,
  //       classId,
  //       userId: user.id,
  //       fullName: user.fullName,
  //       email: user.email,
  //       createdAt: teacherIds.get(user.id)!.createdAt || 0,
  //     });
  //   }
  //   if (studentIds.has(user.id)) {
  //     participants.students.push({
  //       id: studentIds.get(user.id)!.id,
  //       className,
  //       classId,
  //       userId: user.id,
  //       fullName: user.fullName,
  //       email: user.email,
  //       createdAt: studentIds.get(user.id)!.createdAt || 0,
  //     });
  //   }
  // }
  // return participants;
}

async function refreshDictionaryWords(dictionaryWords: RawUserDefinitionType[]) {
  if (dictionaryWords.length === 0) {
    return;
  }
  // FIXME: better done in a single transaction...
  const dictionaryId = dictionaryWords[0].dictionaryId;
  let sql = `
    DELETE FROM user_definitions
    WHERE dictionary_id = ?
  `;
  await execute(sql, [[dictionaryId]]);
  sql = `
    INSERT INTO user_definitions (id, dictionary_id, translations, sounds)
    VALUES (?, ?, ?, ?)
  `;

  await execute(
    sql,
    dictionaryWords.map((dw) => [dw.id, dw.dictionaryId, dw.translations, dw.sounds || null]),
  );
}

async function refreshImportWords(importWords: ImportWordType[]) {
  // FIXME: better done in a single transaction...
  if (importWords.length === 0) {
    return;
  }
  const importId = importWords[0].importId;
  let sql = `
    DELETE FROM import_words
    WHERE import_id = ?
  `;
  await execute(sql, [[importId]]);
  await genericTableUpsert("import_words", importWords, ["import_id", "word_id"]);
}

export const sqliteDataManager = {
  getStatsFromAnalysis,
  refreshTempRecentSentenceIds,
  syncCardUpdates,
  getPracticeCard,
  runPragma: async () => {
    const out = await execute(`PRAGMA integrity_check;`);
    console.log("Result of integrity check", out);
  },
  getKnownWords,
  getKnownWordCount,
  getWordlist,
  getListKnownPercentages,
  executeSql,
  getDefinitions,
  getWordDetails,
  getCharacterDetails,
  getWordsByGraphs,
  getWordFromDBs,
  getWordListWordCount,
  getFirstSuccessStatsForList,
  getFirstSuccessStatsForImport,
  getDefaultWordLists,
  getVocabReviews,
  getWaitingRevisions,
  getDayStats,
  getContentAccuracyStatsForImport,
  getContentStatsForImport,
  getImportUtilityStatsForList,
  forceDefinitionsSync,
  close: async () => (isWorker() ? close() : null),
};

export type SqliteDataManager = typeof sqliteDataManager;
export type SqliteDataManagerMethods = keyof typeof sqliteDataManager;
export const sqliteDataManagerKeys = Object.keys(sqliteDataManager) as SqliteDataManagerMethods[];
