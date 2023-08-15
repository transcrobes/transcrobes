import _ from "lodash";
import asyncPool from "tiny-async-pool";
import { $enum } from "ts-enum-util";
import { store } from "../app/createStore";
import { DataManager } from "../data/types";
import { addKnownWords } from "../features/word/knownWordsSlice";
import { IDBFileStorage, getFileStorage } from "../lib/IDBFileStorage";
import { practice } from "../lib/review";
import { CardType, PracticeDetailsType } from "../lib/types";
import { CARD_TYPES, GRADE, getCardId, getCardType, getWordId } from "./rxdb/Schema";
import { SQLiteResults } from "./sqlite/tag";

const IMPORT_FILE_STORAGE = "import_file_storage";
export function getImportFileStorage(): Promise<IDBFileStorage> {
  return getFileStorage(IMPORT_FILE_STORAGE);
}

export async function asyncPoolAllBuffers(
  poolLimit: number,
  array: string[],
  iteratorFn: (generator: string) => Promise<{ partNo: number; ab: ArrayBuffer }>,
) {
  const results: any[] = [];
  for await (const result of asyncPool(poolLimit, array, iteratorFn)) {
    results.push(result);
  }
  return results;
}

export async function asyncPoolAll(
  poolLimit: number,
  array: string[],
  iteratorFn: (generator: string) => Promise<number>,
) {
  const results: any[] = [];
  for await (const result of asyncPool(poolLimit, array, iteratorFn)) {
    results.push(result);
  }
  return results;
}

export function rowToResult(columns: string[], rows: SQLiteCompatibleType[]) {
  const singleRow: any = {};
  for (let k = 0; k < columns.length; k++) {
    singleRow[_.camelCase(columns[k])] = rows[k];
  }
  return singleRow;
}

export function ensureSnakeCaseRecursive(obj: any) {
  // this was entirely written by copilot...
  const snakeCaseObj: any = {};
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      snakeCaseObj[_.snakeCase(key)] = ensureSnakeCaseRecursive(obj[key]);
    } else {
      snakeCaseObj[_.snakeCase(key)] = obj[key];
    }
  }
  return snakeCaseObj;
}

export function ensureCamelCaseRecursive(obj: any) {
  // this was entirely written by copilot...
  const camelCaseObj: any = {};
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      camelCaseObj[_.camelCase(key)] = ensureCamelCaseRecursive(obj[key]);
    } else {
      camelCaseObj[_.camelCase(key)] = obj[key];
    }
  }
  return camelCaseObj;
}

export function sqlResultsToObjects(results: SQLiteResults): any[] {
  const rows = results.rows;
  const columns = results.columns;
  const output: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    output.push(rowToResult(columns, rows[i]));
  }
  return output;
}

export async function practiceCardsForWords(proxy: DataManager, practiceDetails: PracticeDetailsType[]) {
  const newKnown = new Set<string>();
  const cardIds = _.flatten(
    practiceDetails.map((x) =>
      x.cardType
        ? [getCardId(x.wordId, x.cardType)]
        : $enum(CARD_TYPES)
            .getValues()
            .map((ct) => getCardId(x.wordId, ct)),
    ),
  );
  const existing = _.keyBy(await proxy.getByIds({ collection: "cards", ids: cardIds }), "id");
  const cards: CardType[] = [];
  for (const { wordId, cardType, grade, badReviewWaitSecs } of practiceDetails) {
    const cardTypes = cardType ? [cardType] : $enum(CARD_TYPES).getValues();
    for (const ct of cardTypes) {
      const cardId = getCardId(wordId, ct);
      cards.push(practice(existing[cardId] || { id: getCardId(wordId, ct) }, grade, badReviewWaitSecs || 0));
    }
    if (grade > GRADE.UNKNOWN) {
      newKnown.add(wordId);
    }
  }
  await proxy.updateCards(cards);
  await proxy.syncCardUpdates(cards);
  if (newKnown.size > 0) {
    const words = await proxy.getDefinitions({ column: "id", values: [...newKnown.values()] });
    for (const word of words) {
      if (!word.graph) {
        console.warn("Invalid word returned", word);
        throw new Error("Invalid word returned");
      }
      store.dispatch(addKnownWords({ [word.graph]: null }));
    }
  }
  return cards;
}

export function cardToCardsCache(card: CardType) {
  const { id, front, back, interval, repetition, efactor, ...cCard } = card;
  return {
    ...cCard,
    wordId: parseInt(getWordId(card)),
    cardType: parseInt(getCardType(card)),
    suspended: card.suspended ? 1 : (0 as 0 | 1),
    known: card.known ? 1 : (0 as 0 | 1),
  };
}
