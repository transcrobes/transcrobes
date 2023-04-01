import { HistogramGeneratorNumber } from "d3-array";
import dayjs from "dayjs";
import { throttle } from "lodash";
import LZString from "lz-string";
import { HslColor } from "react-colorful";
import {
  CardType,
  DayStat,
  DefinitionsState,
  FirstSuccess,
  HistoData,
  InputLanguage,
  KeyedModels,
  PosSentences,
  PythonCounter,
  RecentSentencesType,
  RepetrobesActivityConfigType,
  SentenceType,
  SystemLanguage,
  SYSTEM_LANG_TO_LOCALE,
  TokenType,
} from "./types";

const TONES = { "\u0304": 1, "\u0301": 2, "\u030c": 3, "\u0300": 4 };

// Stolen from the Hanping anki deck colours
const TONE_COLOURS = {
  1: "dodgerblue",
  2: "forestgreen",
  3: "darkorange",
  4: "crimson",
  5: "grey",
};

const typeSizes = {
  undefined: () => 0,
  boolean: () => 4,
  number: () => 8,
  string: (item: string) => 2 * item.length,
  object: (item: any): number =>
    !item ? 0 : Object.keys(item).reduce((total, key) => sizeOf(key) + sizeOf(item[key]) + total, 0),
};

export function sizeOf(value: any) {
  return (typeSizes as any)[typeof value](value);
}

export function toneColour(pinyin: string) {
  const [tone] = findTone(pinyin);
  return TONE_COLOURS[tone];
}

export function buildSubstrings(str = "") {
  const res: string[] = [];
  for (let i = 0; i < str.length; i++) {
    for (let j = i + 1; j < str.length + 1; j++) {
      res.push(str.slice(i, j));
    }
  }
  return res;
}

export function soundWithSeparators(pinyin: string, index: number, fromLang: InputLanguage) {
  switch (fromLang) {
    case "zh-Hans":
      return index > 0 && pinyin[index - 1] !== "-" && ["a", "e", "o"].includes(pinyin.normalize("NFD")[0])
        ? `'${pinyin}`
        : pinyin;
    default:
      return pinyin;
  }
}

export function findTone(pinyin: string) {
  const n = pinyin.normalize("NFD");
  for (let i = 0; i < n.length; i++) {
    if (TONES[n[i]]) {
      return [TONES[n[i]], i - 1];
    }
  }
  return [5, -1];
}

export function convertArrayToObject(array: any[], key: any) {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: item,
    };
  }, initialValue);
}

export function getKnownChars(
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

export function getSuccessWords(
  knownCards: Map<string, CardType>,
  knownGraphs: Map<string, string>,
  allWordsMap: Map<string, number>,
): FirstSuccess[] {
  const successWords: FirstSuccess[] = [];
  for (const [wordId, card] of knownCards.entries()) {
    const nbOccurrences = allWordsMap.get(knownGraphs.get(wordId) || "");
    if (nbOccurrences) {
      successWords.push({
        firstSuccess: card.firstSuccessDate,
        nbOccurrences: nbOccurrences,
      });
    }
  }
  return successWords;
}

export function hslToHex({ h, s, l }: HslColor): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0"); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function UUID(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function handleBadResponse(url: string, response: Response): void {
  if (!response.ok) {
    const message = `Bad response status for: ${url}. Status: ${response.status}`;
    console.warn(message);
    throw new Error(message);
  }
}

export function getContentBaseURL(contentId: string, shared = false): string {
  return `/api/v1/data/${shared ? "shared" : ""}content/${contentId}`;
}

export function getSubsURL(contentId: string, shared = false): string {
  return `${getContentBaseURL(contentId, shared)}/subtitles.vtt`;
}

export function getManifestURL(contentId: string): string {
  return `${getContentBaseURL(contentId)}/manifest.json`;
}
export function recentSentencesFromLZ(wordId: string, lzContent: string): RecentSentencesType | null {
  const uncompress = LZString.decompressFromUTF16(lzContent);
  return uncompress ? { id: wordId, posSentences: JSON.parse(uncompress) as PosSentences } : null;
}

export function validInt(value: any, minValue?: number, maxValue?: number): boolean {
  return (
    !isNaN(value) &&
    typeof value === "number" &&
    !(typeof minValue !== "undefined" && value < minValue) &&
    !(typeof maxValue !== "undefined" && value > maxValue)
  );
}

export function configIsUsable(activityConfig: RepetrobesActivityConfigType): boolean | undefined {
  if (activityConfig.wordLists === undefined || activityConfig.activeCardTypes === undefined) {
    return undefined;
  }
  return (
    (activityConfig.systemWordSelection || (activityConfig.wordLists || []).filter((wl) => wl.selected).length > 0) &&
    (activityConfig.activeCardTypes || []).filter((ct) => ct.selected).length > 0 &&
    validInt(activityConfig.dayStartsHour) &&
    validInt(activityConfig.badReviewWaitSecs) &&
    validInt(activityConfig.maxNew) &&
    validInt(activityConfig.maxRevisions)
  );
}

export function tokensInModel(models: KeyedModels): number {
  // TODO: actually it might be better to check whether the tokens need enriching, because
  // that is what actually costs, but this way we don't need to filter/iterate the tokens,
  // just get the length, so this will be much quicker, and normal sentences will contain
  // *mainly* enrichable text... at least they do now!
  let counter = 0;
  for (const model of Object.values(models)) {
    const l = model.s.length;
    for (let i = 0; i < l; i++) {
      counter += model.s[i].t.length;
    }
  }
  return counter;
}
export function missingWordIdsFromModels(models: KeyedModels, existing: DefinitionsState): Set<string> {
  const uniqueIds = wordIdsFromModels(models);
  const newIds = new Set<string>();

  for (const id of uniqueIds) {
    if (!(id in existing)) {
      newIds.add(id);
    }
  }
  return newIds;
}

export function wordIdsFromModels(models: KeyedModels): Set<string> {
  const uniqueIds = new Set<string>();
  for (const model of Object.values(models)) {
    for (const sentence of model.s) {
      for (const token of sentence.t) {
        if (token.id) {
          uniqueIds.add(token.id.toString());
        }
        if (token.oids) {
          for (const oid of token.oids) {
            uniqueIds.add(oid.toString());
          }
        }
      }
    }
  }
  return uniqueIds;
}

export function toggleFullscreen(doc: Document, videoWrapper: HTMLElement): void {
  if (doc.fullscreenElement) {
    exitFullscreen(doc);
  } else {
    launchFullscreen(videoWrapper);
  }
}

// Find the right method, call on correct element
function launchFullscreen(element: HTMLElement): void {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
}

function exitFullscreen(doc: Document): void {
  if (doc.exitFullscreen) {
    doc.exitFullscreen();
  }
}

export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

export function say(text: string, lang: SystemLanguage, voice?: SpeechSynthesisVoice): void {
  const synth = window.speechSynthesis;
  if (voice && voice.lang !== SYSTEM_LANG_TO_LOCALE[lang]) {
    throw new Error("The language of the voice and lang must be the same");
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SYSTEM_LANG_TO_LOCALE[lang];
  if (voice) {
    utterance.voice = voice;
    utterance.volume = 1;
    synth.speak(utterance);
  } else {
    getVoices()
      .then((voices) => {
        utterance.voice =
          voices.filter((x) => x.lang === SYSTEM_LANG_TO_LOCALE[lang] && x.localService)[0] ||
          voices.filter((x) => x.lang === SYSTEM_LANG_TO_LOCALE[lang] && !x.localService)[0];
        synth.speak(utterance);
      })
      .catch((error) => {
        console.log("error", error);
      });
  }
}

export function onError(e: string): void {
  console.error(e);
}

export function pythonCounter(value: Iterable<any>): PythonCounter {
  const array = Array.isArray(value) ? value : Array.from(value);
  const count: PythonCounter = {};
  array.forEach((val) => (count[val] = (count[val] || 0) + 1));
  return count;
}

// FIXME: should probably be some sort of pattern, not just string
export function parseJwt(token: string): any {
  // TODO: this will apparently not do unicode properly. For the moment we don't care.
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  return JSON.parse(atob(base64));
  // return JSON.parse(Buffer.from(base64, "base64"));
}

export function binnedDayData(
  binFunc: HistogramGeneratorNumber<number, number>,
  thresholds: number[],
  dayStats: DayStat[],
): HistoData[] {
  const dayTotals: Map<number, number> = new Map<number, number>();
  for (const dayStat of dayStats) {
    dayTotals.set(dayStat.day, (dayTotals.get(dayStat.day) || 0) + dayStat.nbOccurrences);
  }
  const rawBins = binFunc([...dayTotals.keys()].map((c) => c));
  const binned = rawBins.map((v: number[]) => v.reduce((prev, next) => prev + (dayTotals.get(next) || 0), 0));

  const data: HistoData[] = Array<HistoData>(thresholds.length);
  for (let i = 0; i < thresholds.length; i++) {
    data[i] = {
      name: dayjs(thresholds[i] * 1000).format("YYYY-MM-DD"),
      value: binned[i],
    };
  }
  return data;
}

export function binnedData(
  binFunc: HistogramGeneratorNumber<number, number>,
  thresholds: number[],
  successes: FirstSuccess[],
  total: number,
  yIsNumber = false,
): HistoData[] {
  const successTotals: Map<number, number> = new Map<number, number>();
  for (const success of successes) {
    successTotals.set(success.firstSuccess, (successTotals.get(success.firstSuccess) || 0) + success.nbOccurrences);
  }
  const rawBins = binFunc([...successTotals.keys()].map((c) => c));
  let temp = 0;
  let binned = rawBins.map(
    (v: Array<number>) => (temp += v.reduce((prev, next) => prev + (successTotals.get(next) || 0), 0)),
  );
  if (!yIsNumber) {
    binned = binned.map((b: number) => (b / total) * 100);
  }

  const data: HistoData[] = Array<HistoData>(thresholds.length);
  for (let i = 0; i < thresholds.length; i++) {
    data[i] = {
      name: dayjs(thresholds[i] * 1000).format("YYYY-MM-DD"),
      value: binned[i],
    };
  }
  return data;
}

export function cleanSentence(sentence: SentenceType): SentenceType {
  for (let i = 0; i < sentence.t.length; i++) {
    delete sentence.t[i].de;
    delete sentence.t[i].style;
  }
  return sentence;
}

export function throttleAction(action: any, wait: number, options: any) {
  // for options see: https://lodash.com/docs/4.17.4#throttle
  const throttled = throttle((dispatch, actionArgs) => dispatch(action(...actionArgs)), wait, options);

  // see: https://github.com/gaearon/redux-thunk
  const thunk =
    (...actionArgs: any[]) =>
    (dispatch: any) =>
      throttled(dispatch, actionArgs);

  // provide hook to _.throttle().cancel() to cancel any trailing invocations
  thunk.cancel = throttled.cancel;
  thunk.flush = throttled.flush;
  thunk.type = action.type;

  return thunk;
}
export function toPercent(yesValue: number, noValue: number) {
  return Number(yesValue / (yesValue + noValue)).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
  });
}

export function originalSentenceFromTokens(tokens: TokenType[]): string {
  // currently just use
  return tokens.map((x) => x.l).join("");
}

export function reorderArray(list: any[], startIndex: number, endIndex: number): any[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export function isAlphabetic(lang: SystemLanguage): boolean {
  return ["en"].includes(lang);
}

export function hasTones(lang: InputLanguage): boolean {
  return ["zh-Hans"].includes(lang);
}

export function hasCharacters(lang: SystemLanguage): boolean {
  return ["zh-Hans"].includes(lang);
}

export function isScriptioContinuo(lang: SystemLanguage): boolean {
  return ["zh-Hans"].includes(lang);
}

export function needsLatinFont(lang: SystemLanguage): boolean {
  return ["en"].includes(lang);
}

export function toEnrich(charstr: string, fromLang: InputLanguage): boolean {
  // TODO: find out why the results are different if these consts are global...
  // unicode cjk radicals, supplement and characters, see src/enrichers/zhhans/__init__.py for details
  const zhReg = /[\u2e80-\u2ef3\u2f00-\u2fd5\u4e00-\u9fff]+/gi;
  const enReg = /[[A-z]+/gi;
  switch (fromLang) {
    case "en":
      // FIXME: this is not really correct, but it's a start
      return enReg.test(charstr);
    case "zh-Hans":
      return zhReg.test(charstr);
  }
}

export function camelToSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function getLanguageFromPreferred(langs: readonly string[]): SystemLanguage {
  let language: SystemLanguage = "en";
  for (const lang of langs) {
    if (lang.startsWith("en")) {
      return language;
    } else if (lang.startsWith("zh")) {
      return "zh-Hans";
    }
  }
  return language;
}
