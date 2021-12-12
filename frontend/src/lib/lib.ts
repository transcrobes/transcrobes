import { DefinitionDocument } from "../database/Schema";
import {
  DefinitionType,
  ProviderTranslationType,
  PythonCounter,
  TokenType,
  ZH_TB_POS_TO_SIMPLE_POS,
  TREEBANK_POS_TYPES,
  PosTranslationsType,
  ZH_TB_POS_LABELS,
  SIMPLE_POS_ENGLISH_NAMES,
  SIMPLE_POS_TYPES,
  InputLanguage,
} from "./types";
import { getAccess, refreshAccessToken } from "./JWTAuthProvider";

import unidecode from "unidecode";
import dayjs, { OpUnitType, QUnitType } from "dayjs";

// I am genuinely not intelligent enough to code like a proper human being in js
// It is a horrible language, written by horrible people, for horrible people
// ¯_(ツ)_/¯

const EVENT_QUEUE_PROCESS_FREQ = 5000; //milliseconds
const PUSH_FILES_PROCESS_FREQ = 5000; //milliseconds
const ONSCREEN_DELAY_IS_CONSIDERED_READ = 5000; // milliseconds
const IDEAL_GLOSS_STRING_LENGTH = 5; // pretty random but https://arxiv.org/pdf/1208.6109.pdf
const DEFAULT_RETRIES = 3;

let accessToken = "";
let refreshToken = "";

let langPair = "";
let username = "";
let password = "";
let baseUrl = "";
let glossing = -1;
let fontSize = 100;
let segmentation = true;
let mouseover = true;
let collectRecents = true;
let themeName = "dark";
let eventSource = "lib.ts";
let glossNumberNouns = false;
let onScreenDelayIsConsideredRead = ONSCREEN_DELAY_IS_CONSIDERED_READ;

// FIXME: replace all this rubbish with Redux!!!!!!!
function setAccessToken(value: string): void {
  accessToken = value;
}
function setRefreshToken(value: string): void {
  refreshToken = value;
}
function setUsername(value: string): void {
  username = value;
}
function setLangPair(value: string): void {
  langPair = value;
}
function setPassword(value: string): void {
  password = value;
}
function setBaseUrl(value: string): void {
  baseUrl = new URL(value).origin + "/";
}
// FIXME: this should be an enum
function setGlossing(value: USER_STATS_MODE_KEY_VALUES): void {
  glossing = value;
}
function setGlossNumberNouns(value: boolean): void {
  glossNumberNouns = value;
}
function setOnScreenDelayIsConsideredRead(value = 5000): void {
  onScreenDelayIsConsideredRead = value;
}
function setFontSize(value: number): void {
  fontSize = value;
}
function setSegmentation(value: boolean): void {
  segmentation = value;
}
function setMouseover(value: boolean): void {
  mouseover = value;
}
function setCollectRecents(value: boolean): void {
  collectRecents = value;
}
// FIXME: should be an enum
function setThemeName(value: string): void {
  themeName = value;
}
function setEventSource(value: string): void {
  eventSource = value;
}

function fromLang() {
  if (!langPair) throw new Error("System improperly initialised, langPair is unset");
  return langPair.split(":")[0];
}

function toSimplePos(complexPos: TREEBANK_POS_TYPES): SIMPLE_POS_TYPES {
  if (fromLang() === "zh-Hans") {
    return ZH_TB_POS_TO_SIMPLE_POS[complexPos];
  }
  throw new Error(`Unknown from language "${fromLang()}", can't find standard/simple POS`);
}

export function toPosLabels(complexPos: TREEBANK_POS_TYPES): string {
  if (fromLang() === "zh-Hans") {
    return ZH_TB_POS_LABELS[complexPos];
  }
  throw new Error(`Unknown from language "${fromLang()}", can't find POS label`);
}

export function toSimplePosLabels(pos: SIMPLE_POS_TYPES): string {
  if (fromLang() === "zh-Hans") {
    return SIMPLE_POS_ENGLISH_NAMES[pos];
  }
  throw new Error(`Unknown from language "${fromLang()}", can't find simple POS label`);
}

export function complexPosToSimplePosLabels(pos: TREEBANK_POS_TYPES): string {
  if (fromLang() === "zh-Hans") {
    return SIMPLE_POS_ENGLISH_NAMES[ZH_TB_POS_TO_SIMPLE_POS[pos]];
  }
  throw new Error(`Unknown from language "${fromLang()}", can't find simple POS label`);
}

export function dateRange(
  start: Date | number,
  end: Date | number,
  interval: QUnitType | OpUnitType,
  asUnixTimestamps = false,
): (number | Date)[] {
  const startDate = typeof start === "number" ? dayjs(start * 1000) : dayjs(start);
  const endDate = typeof end === "number" ? dayjs(end * 1000) : dayjs(start);
  const diffInUnits = endDate.diff(startDate, interval);
  return Array.from(Array(diffInUnits + 1).keys()).map((i) => {
    return asUnixTimestamps
      ? startDate.add(i, interval).valueOf() / 1000
      : startDate.add(i, interval).toDate();
  });
}

function apiUnavailable(message: string, doc = document) {
  // close the popup if it's open
  doc.querySelectorAll(".tcrobe-def-popup").forEach((el) => el.remove());

  const error = doc.createElement("div");
  error.appendChild(doc.createTextNode(`Transcrobes Server ${baseUrl} Unavailable. ${message}`));
  error.style.position = "fixed";
  error.style.width = "100%";
  error.style.height = "60px";
  error.style.top = "0";
  error.style.backgroundColor = "red";
  error.style.fontSize = "large";
  error.style.textAlign = "center";
  error.style.zIndex = "1000000";
  doc.body.prepend(error);
}

function filterKnown(
  knownNoteBases: PythonCounter,
  knownNotes: Set<string>,
  words: string[],
  minMorphemeKnownCount = 2,
  preferWholeKnownWords = true,
): string[] {
  if (words.length === 0) {
    return [];
  } // or null?

  const known = [];
  const wholeKnownWords = [];
  for (const word of words) {
    if (knownNotes.has(word)) {
      if (preferWholeKnownWords) {
        wholeKnownWords.push(word);
      } else {
        known.push(word);
      }
    } else if (minMorphemeKnownCount > 0) {
      let good = true;
      for (const character of Array.from(word)) {
        if (!(character in knownNoteBases) || knownNoteBases[character] < minMorphemeKnownCount) {
          good = false;
          break;
        }
      }
      if (good) {
        known.push(word);
      }
    }
  }
  return wholeKnownWords.concat(known);
}

function getInputLang(): InputLanguage {
  return fromLang() as InputLanguage;
}

function toEnrich(charstr: string, fromLanguage: InputLanguage = "zh-Hans"): boolean {
  // TODO: find out why the results are different if these consts are global...
  // unicode cjk radicals, supplement and characters, see src/enrichers/zhhans/__init__.py for details
  const zhReg = /[\u2e80-\u2ef3\u2f00-\u2fd5\u4e00-\u9fff]+/gi;
  // const enReg = /[[A-z]+/gi;
  switch (fromLanguage || fromLang()) {
    // case "en":
    //   return enReg.test(charstr);
    case "zh-Hans":
      return zhReg.test(charstr);
  }
}

function simpOnly(query: string): boolean {
  // eslint-disable-next-line no-control-regex
  return toEnrich(query, "zh-Hans") && query === query.replace(/[\x00-\x7F]/g, "");
}

const API_PREFIX = "/api/v1";

const USER_STATS_MODE = {
  IGNORE: -1,
  UNMODIFIED: 0,
  NO_GLOSS: 2, // segmented
  L2_SIMPLIFIED: 4, // e.g, using "simple" Chinese characters
  TRANSLITERATION: 6, // e.g, pinyin
  L1: 8, // e.g, English
  TRANSLITERATION_L1: 9, // e.g, pinyin + English
};

type USER_STATS_MODE_KEY = keyof typeof USER_STATS_MODE;
export type USER_STATS_MODE_KEY_VALUES = typeof USER_STATS_MODE[USER_STATS_MODE_KEY];

async function getRequestOptions(
  baseUrl: string,
  forcePost = false,
  body?: BodyInit,
): Promise<RequestInit> {
  const options: RequestInit = {};
  let token = await getAccess();
  if (!token) {
    await refreshAccessToken(new URL(baseUrl));
  }
  token = await getAccess();
  if (!token) {
    throw Error("Unable to get authentication");
  }

  if (body || forcePost) {
    options.method = "POST";
    options.body =
      typeof body === "string" || body instanceof FormData ? body : JSON.stringify(body);
  }
  // options.credentials = "same-origin";
  options.credentials = "include";
  options.headers = {
    Accept: "application/json",
    Authorization: "Bearer " + token,
  };
  if (!(body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
  }
  options.cache = "no-cache";

  return options;
}

function filterFakeL1Definitions(entries: string[], phone: string[]): string[] {
  const filtered: string[] = [];
  for (const entry of entries) {
    const local_phone = unidecode(phone.join("").split(/(\s+)/).join("")).toLowerCase();
    // we DON'T do a entry.toLowerCase() because we DO want proper names, but proper names should always
    // be capitalised, so Xi Jingping, Huawei, etc. should be Ok.
    if (local_phone != entry.split(/(\s+)/).join("")) {
      filtered.push(entry);
    }
  }
  return filtered;
}

export function bestGuess(token: TokenType, definition: DefinitionType): string {
  // FIXME: this is a ZH-HANS -> EN only hack, and needs to be architected eventually
  // something like what the Python has with distinct managers for each L2 -> L1. Later.
  let best = "";
  const others: string[] = [];
  const allDefs: PosTranslationsType[] = [];
  const dictEntries = definition.providerTranslations;
  for (const providerEntry of dictEntries) {
    if (!providerEntry.posTranslations) continue;

    for (const posEntry of providerEntry.posTranslations) {
      if (posEntry.values.length === 0) continue;
      allDefs.push(posEntry);
      if (token.pos && toSimplePos(token.pos) === posEntry.posTag) {
        // sorted_defs = sorted(defs, key=lambda i: i["cf"], reverse=True)  # original python
        // const sortedDefs = defs.sort((a: any, b: any) => a.cf - b.cf);  // possible js, if we had cf
        const filteredDefs = filterFakeL1Definitions(posEntry.values, definition.sound);
        if (filteredDefs) {
          // prefer one that is closer to our ideal length, particularly useful when there very long entries
          // but also shorter Ok ones
          if (providerEntry.provider !== "mst") {
            // FIXME: harcoded hack :-< - mst always *has* a cf (confidence score) and pos, and the order we
            // get them in is ordered by cf, so only order by ideal length if we aren't already ordered
            filteredDefs.sort(
              (a, b) =>
                Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) -
                Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
            );
          }
          best = filteredDefs[0];
          break;
        }
      } else if (posEntry.posTag === "OTHER") {
        others.push(...posEntry.values);
      }
    }
    if (best) {
      break;
    }
  }
  if (!best && others.length > 0) {
    const filteredDefs = filterFakeL1Definitions(others, definition.sound);
    if (filteredDefs) {
      // prefer one that is closer to our ideal length, particularly useful when there very long entries
      // but also shorter Ok ones
      filteredDefs.sort(
        (a, b) =>
          Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) -
          Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
      );
      best = filteredDefs[0];
    }
  }
  if (!best && allDefs.length > 0) {
    best = allDefs
      .flatMap((p) => p.values)
      .sort(
        (a, b) =>
          Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) -
          Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
      )[0];
  }
  return best;
}

export async function fetchPlus(
  url: string | URL,
  body?: BodyInit,
  retries = 3,
  forcePost = false,
): Promise<any> {
  if (!retries || retries < 0) {
    throw new Error(`Exhausted all retry attempts, failing for ${url} with ${body}`);
  }

  const options = await getRequestOptions(url.toString(), forcePost, body);
  let res;
  try {
    res = await fetch(url.toString(), options);

    if (res.status === 200) {
      return await res.json();
    }
    if (res.status === 401 || res.status === 403) {
      await refreshAccessToken(new URL(url.toString()));
    }
  } catch (error: any) {
    if ("status" in error && (error.status === 401 || error.status === 403)) {
      await refreshAccessToken(new URL(url.toString()));
    }
    const errorMessage = await res?.text();
    console.error(
      "There was a different error, badness",
      url,
      options,
      JSON.stringify(error),
      errorMessage,
    );
  }
  return await fetchPlus(url, options.body || undefined, retries - 1);
}

function sortByWcpm(a: DefinitionDocument, b: DefinitionDocument): number {
  const aa = parseFloat(a.frequency.wcpm);
  const bb = parseFloat(b.frequency.wcpm);
  if (isNaN(bb)) {
    return -1;
  }
  if (isNaN(aa)) {
    return 1;
  }
  return bb - aa;
}

function shortMeaning(providerTranslations: ProviderTranslationType[]): string {
  for (const provTranslation of providerTranslations) {
    if (provTranslation.posTranslations.length > 0) {
      let meaning = "";
      for (const posTranslation of provTranslation.posTranslations) {
        meaning += `${posTranslation.posTag}: ${posTranslation.values.join(", ")}; `;
      }
      return meaning;
    }
  }
  return "";
}

// function dbSynchingOverlay(element, message) {
//   element.id = "db-synching-overlay";
//   element.style.display = "block";
//   element.style.position = "fixed";
//   element.style.width = "100%";
//   element.style.height = "100%";
//   element.style.top = "0px";
//   element.style.left = "0px";
//   element.style.opacity = "0.9";
//   element.style.backgroundColor = "#ccc";
//   element.style.color = "#000";
//   element.style.fontSize = "large";
//   element.style.textAlign = "center";
//   element.style.zIndex = 100000;
// }

export {
  sortByWcpm,
  shortMeaning,
  API_PREFIX,
  DEFAULT_RETRIES,
  EVENT_QUEUE_PROCESS_FREQ,
  PUSH_FILES_PROCESS_FREQ,
  ONSCREEN_DELAY_IS_CONSIDERED_READ,
  accessToken,
  refreshToken,
  username,
  langPair,
  password,
  baseUrl,
  glossing,
  mouseover,
  collectRecents,
  fontSize,
  segmentation,
  onScreenDelayIsConsideredRead,
  themeName,
  glossNumberNouns,
  // property setters
  setAccessToken,
  setRefreshToken,
  setUsername,
  setPassword,
  setLangPair,
  setBaseUrl,
  setGlossing,
  setGlossNumberNouns,
  setFontSize,
  setSegmentation,
  setMouseover,
  setCollectRecents,
  setOnScreenDelayIsConsideredRead,
  setThemeName,
  setEventSource,
  // functions
  filterFakeL1Definitions,
  getInputLang,
  toEnrich,
  simpOnly,
  filterKnown,
  toSimplePos,
  USER_STATS_MODE,
};
