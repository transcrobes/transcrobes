import dayjs, { ManipulateType } from "dayjs";
import split from "pinyin-split";
import polyglotI18nProvider from "ra-i18n-polyglot";
import unidecode from "unidecode";
import { DefinitionDocument } from "../database/Schema";
import englishMessages from "../i18n/en";
import chineseMessages from "../i18n/zh";
import { fetcher } from "./fetcher";
import { toEnrich } from "./funclib";
import {
  AnyPosType,
  AnyTreebankPosType,
  DefinitionType,
  EN_TB_POS_TO_SIMPLE_POS,
  EN_ZHHANS_DICT_PROVIDERS,
  IDEAL_GLOSS_STRING_LENGTH,
  ImportAnalysis,
  InputLanguage,
  LOCALES,
  PosTranslationsType,
  ProviderTranslationType,
  PythonCounter,
  ReaderState,
  STREAMER_DETAILS,
  SerialisableStringSet,
  SupportedStreamer,
  SystemLanguage,
  TokenType,
  ZHHANS_EN_DICT_PROVIDERS,
  ZH_TB_POS_TO_SIMPLE_POS,
  isEnTreebankPOS,
  isSimplePOS,
  isZhTreebankPOS,
} from "./types";

export function getMessages(locale: string) {
  switch (locale) {
    case "zh-Hans":
      return chineseMessages;
    default:
      return englishMessages;
  }
}

export function streamingSite(url: string): SupportedStreamer | null {
  for (const [name, pattern] of Object.entries(STREAMER_DETAILS)) {
    if (pattern.ui.test(url)) {
      return name as SupportedStreamer;
    }
  }
  return null;
}

export function getI18nProvider(locale?: SystemLanguage) {
  return polyglotI18nProvider(getMessages, locale || "en", LOCALES);
}

export function toSimplePos(pos: AnyPosType, fromLang: InputLanguage) {
  if (fromLang === "zh-Hans") {
    return isSimplePOS(pos) ? pos : ZH_TB_POS_TO_SIMPLE_POS[pos];
  } else if (fromLang === "en") {
    return isSimplePOS(pos) ? pos : EN_TB_POS_TO_SIMPLE_POS[pos];
  }
  throw new Error(`Unknown from language "${fromLang}", can't find standard/simple POS`);
}

export function toPosLabels(pos: AnyPosType, toLang: SystemLanguage): string {
  if (toLang === "zh-Hans") {
    return (isEnTreebankPOS(pos) ? "pos.en_treebank." : "pos.simple.") + pos;
  } else if (toLang === "en") {
    return (isZhTreebankPOS(pos) ? "pos.zh_treebank." : "pos.simple.") + pos;
  }
  throw new Error(`Unknown to language "${toLang}", can't find POS label`);
}

export function filterKnown(
  knownNoteBases: PythonCounter,
  knownNotes: SerialisableStringSet,
  words: string[],
  minMorphemeKnownCount = 2,
  preferWholeKnownWords = true,
): string[] {
  if (words.length === 0) {
    return [];
  } // or null?

  const known: string[] = [];
  const wholeKnownWords: string[] = [];
  for (const word of words) {
    if (word in knownNotes) {
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

function getFilteredBestGuess(
  others: string[],
  definition: DefinitionType,
  allDefs: PosTranslationsType[],
  fromLang: InputLanguage,
) {
  let filteredDefs = filterFakeL1Definitions(
    filterUnhelpfulL1Definitions(others),
    cleanedSound(definition, fromLang),
    fromLang,
  );
  if (filteredDefs.length) {
    return filteredDefs.sort(
      (a, b) => Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) - Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
    )[0];
  }
  filteredDefs = filterFakeL1Definitions(
    filterUnhelpfulL1Definitions(allDefs.flatMap((p) => p.values)),
    cleanedSound(definition, fromLang),
    fromLang,
  );
  if (filteredDefs.length) {
    return filteredDefs.sort(
      (a, b) => Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) - Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
    )[0];
  }
  return allDefs
    .flatMap((p) => p.values)
    .sort((a, b) => Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) - Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length))[0];
}

export function bestGuess(
  token: TokenType,
  definitions: DefinitionType[],
  fromLang: InputLanguage,
  toLang: SystemLanguage,
  readerConfig: ReaderState,
): string {
  if (fromLang === "zh-Hans" && toLang === "en") {
    return bestGuessZhHansToEn(token, definitions, readerConfig);
  } else if (fromLang === "en" && toLang === "zh-Hans") {
    return bestGuessEnToZhHans(token, definitions, readerConfig);
  } else {
    throw new Error(`Unknown from language "${fromLang}", can't find best guess`);
  }
}

export function bestGuessEnToZhHans(
  token: TokenType,
  definitions: DefinitionType[],
  readerConfig: ReaderState,
): string {
  // FIXME: this is a EN -> ZH-HANS only hack, and needs to be architected eventually
  // something like what the Python has with distinct managers for each L2 -> L1. Later.
  let best = "";
  const fromLang: InputLanguage = "en";
  const others: string[] = [];
  const allDefs: PosTranslationsType[] = [];

  // FIXME: this is really nasty... but it's a hack for now
  let definition: DefinitionType | null = null;

  for (const tmpDef of definitions) {
    if (tmpDef.graph.toLowerCase() === token.l.toLowerCase()) {
      definition = tmpDef;
      break;
    } else if (token.w && tmpDef.graph.toLowerCase() === token.w.toLowerCase()) {
      definition = tmpDef;
    } else if (tmpDef.graph === token.l && !definition) {
      definition = tmpDef;
    }
  }
  if (!definition) {
    definition = definitions[0];
    console.error("No definition found for token", token, definitions);
  }

  const dictEntries = orderTranslations(definition.providerTranslations, readerConfig.translationProviderOrder);
  for (const providerEntry of dictEntries) {
    if (!providerEntry.posTranslations) continue;

    for (const posEntry of providerEntry.posTranslations) {
      if (!posEntry.values.length) continue;
      allDefs.push(posEntry);
      if (token.pos && toSimplePos(token.pos, fromLang) === toSimplePos(posEntry.posTag, fromLang)) {
        // sorted_defs = sorted(defs, key=lambda i: i["cf"], reverse=True)  # original python
        // const sortedDefs = defs.sort((a: any, b: any) => a.cf - b.cf);  // possible js, if we had cf
        const filteredDefs = filterFakeL1Definitions(
          filterUnhelpfulL1Definitions(posEntry.values),
          cleanedSound(definition, fromLang),
          fromLang,
        );
        if (filteredDefs) {
          // prefer one that is closer to our ideal length, particularly useful when there very long entries
          // but also shorter Ok ones
          if (providerEntry.provider !== "mst") {
            // FIXME: harcoded hack :-< - mst always *has* a cf (confidence score) and pos, and the order we
            // get them in is ordered by cf, so only order by ideal length if we aren't already ordered
            filteredDefs.sort(
              (a, b) => Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) - Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
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
      return best;
    } else if (readerConfig.strictProviderOrdering && allDefs.length) {
      return getFilteredBestGuess(others, definition, allDefs, fromLang);
    }
  }
  return getFilteredBestGuess(others, definition, allDefs, fromLang);
}

export function bestGuessZhHansToEn(
  token: TokenType,
  definitions: DefinitionType[],
  readerConfig: ReaderState,
): string {
  // FIXME: this is a ZH-HANS -> EN only hack, and needs to be architected eventually
  // something like what the Python has with distinct managers for each L2 -> L1. Later.

  // FIXME: we should only get a single value at the moment...
  const definition = definitions[0];
  let best = "";
  const fromLang: InputLanguage = "zh-Hans";
  const others: string[] = [];
  const allDefs: PosTranslationsType[] = [];
  const dictEntries = orderTranslations(definition.providerTranslations, readerConfig.translationProviderOrder);
  for (const providerEntry of dictEntries) {
    if (!providerEntry.posTranslations) continue;

    for (const posEntry of providerEntry.posTranslations) {
      if (!posEntry.values.length) continue;
      allDefs.push(posEntry);
      if (token.pos && toSimplePos(token.pos, fromLang) === toSimplePos(posEntry.posTag, fromLang)) {
        // sorted_defs = sorted(defs, key=lambda i: i["cf"], reverse=True)  # original python
        // const sortedDefs = defs.sort((a: any, b: any) => a.cf - b.cf);  // possible js, if we had cf
        const filteredDefs = filterFakeL1Definitions(
          filterUnhelpfulL1Definitions(posEntry.values),
          cleanedSound(definition, fromLang),
          fromLang,
        );
        if (filteredDefs) {
          // prefer one that is closer to our ideal length, particularly useful when there very long entries
          // but also shorter Ok ones
          if (providerEntry.provider !== "mst") {
            // FIXME: harcoded hack :-< - mst always *has* a cf (confidence score) and pos, and the order we
            // get them in is ordered by cf, so only order by ideal length if we aren't already ordered
            filteredDefs.sort(
              (a, b) => Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) - Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
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
      return best;
    } else if (readerConfig.strictProviderOrdering && allDefs.length) {
      return getFilteredBestGuess(others, definition, allDefs, fromLang);
    }
  }
  return getFilteredBestGuess(others, definition, allDefs, fromLang);
}

export function filterUnhelpfulL1Definitions(entries: string[]): string[] {
  const filtered: string[] = [];
  for (const entry of entries) {
    if (entry === affixCleaned(entry)) {
      filtered.push(entry);
    }
  }
  return filtered;
}

export function filterFakeL1Definitions(entries: string[], phone: string[], fromLang: InputLanguage): string[] {
  if (fromLang !== "zh-Hans") return entries;
  const filtered: string[] = [];
  for (const entry of entries) {
    if (!isFakeL1(phone, entry, fromLang)) {
      filtered.push(entry);
    }
  }
  return filtered;
}

export function shortProviderTranslations(
  definition: DefinitionType,
  fromLang: InputLanguage,
  maxLength: number = 100,
): string {
  let transes: Set<string> = new Set();
  for (const provider of definition.providerTranslations) {
    for (const posTranslation of provider.posTranslations) {
      // TODO: probably don't need filterUnhelpfulL1Definitions here?
      const cleanDefs = filterFakeL1Definitions(posTranslation.values, cleanedSound(definition, fromLang), fromLang);
      for (const def of cleanDefs.slice(0, 3)) {
        transes.add(def.toLocaleLowerCase());
      }
    }
  }
  return [...transes].join(", ").slice(0, maxLength);
}

export function enrichNodes(nodes: Node[], transcroberObserver: IntersectionObserver, fromLang: InputLanguage): void {
  nodes.forEach((textNode) => {
    if (textNode.nodeValue && textNode.parentElement) {
      if (
        // either it's been done, or is not to do
        !!textNode.parentElement?.parentElement?.parentElement?.dataset?.tced ||
        !toEnrich(textNode.nodeValue, fromLang)
      ) {
        console.debug("Not enriching: " + textNode.nodeValue);
        return;
      }
      transcroberObserver.observe(textNode.parentElement);
    }
  });
}

export function textNodes(node: HTMLElement): Node[] {
  return walkNodeTree(node, {
    inspect: (n: Node) => !["STYLE", "SCRIPT"].includes(n.nodeName),
    collect: (n: Node) => n.nodeType === 3 && !!n.nodeValue && !!n.nodeValue.match(/\S/),
    //callback: n => console.log(n.nodeName, n),
  });
}

function walkNodeTree(root: HTMLElement, options: TreeWalkerMethods) {
  options = options || {};
  const inspect: (n: Node) => boolean = options.inspect || ((_n) => true);
  const collect: (n: Node) => boolean = options.collect || ((_n) => true);
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode: function (node) {
      if (!inspect(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!collect(node)) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Node[] = [];
  let n;
  while ((n = walker.nextNode())) {
    // options.callback && options.callback(n);
    nodes.push(n);
  }

  return nodes;
}

type TreeWalkerMethods = {
  inspect: (n: Node) => boolean;
  collect: (n: Node) => boolean;
};

export function complexPosToSimplePosLabels(
  pos: AnyTreebankPosType,
  fromLang: InputLanguage,
  toLang: SystemLanguage,
): string {
  if (toLang === "zh-Hans" && fromLang === "en") {
    return "pos.simple." + [EN_TB_POS_TO_SIMPLE_POS[pos]];
  } else if (toLang === "en" && fromLang === "zh-Hans") {
    return "pos.simple." + [ZH_TB_POS_TO_SIMPLE_POS[pos]];
  }
  throw new Error(`Unknown to language "${toLang}", can't find simple POS label`);
}

export function dateRange(
  start: Date | number,
  end: Date | number,
  interval: ManipulateType,
  asUnixTimestamps = false,
): (number | Date)[] {
  const startDate = typeof start === "number" ? dayjs(start * 1000) : dayjs(start);
  const endDate = typeof end === "number" ? dayjs(end * 1000) : dayjs(start);
  const diffInUnits = endDate.diff(startDate, interval);
  return Array.from(Array(diffInUnits + 1).keys()).map((i) => {
    return asUnixTimestamps ? startDate.add(i, interval).valueOf() / 1000 : startDate.add(i, interval).toDate();
  });
}

export function sortByWcpm(a: DefinitionDocument, b: DefinitionDocument): number {
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

export function getDefaultLanguageDictionaries(fromLang: InputLanguage) {
  if (fromLang === "zh-Hans") {
    return ZHHANS_EN_DICT_PROVIDERS;
  } else if (fromLang === "en") {
    return EN_ZHHANS_DICT_PROVIDERS;
  }
  throw new Error(`Unknown from language "${fromLang}", can't find default dictionaries`);
}

export function simpOnly(query: string, fromLang: InputLanguage): boolean {
  // eslint-disable-next-line no-control-regex
  if (fromLang === "zh-Hans") {
    return toEnrich(query, fromLang) && query === query.replace(/[\x00-\x7F]/g, "");
  } else if (fromLang === "en") {
    // FIXME: this is not correct, but it's a good enough approximation for now
    return toEnrich(query, fromLang);
  }
  throw new Error(`Unknown from language "${fromLang}", can't find POS`);
}

export function sumValues(pyCount: PythonCounter | undefined) {
  return Object.values(pyCount || {}).reduce((a, b) => a + b, 0);
}

export function cleanAnalysis(analysis: ImportAnalysis, keepLang: InputLanguage): { [key: string]: string[] } {
  const buckets: { [key: string]: string[] } = {};
  for (const [key, value] of Object.entries(analysis.vocabulary.buckets)) {
    const vocab = value.filter((v) => toEnrich(v, keepLang));
    if (vocab.length > 0) {
      buckets[key] = vocab;
    }
  }
  return buckets;
}

export async function fetchPlusResponse(
  url: string | URL,
  body?: BodyInit,
  retries?: number,
  forcePost = false,
  expectJson = true,
): Promise<Response> {
  return fetcher.fetchPlusResponse(url, body, retries, forcePost, expectJson);
}

export async function fetchPlus(
  url: string | URL,
  body?: BodyInit,
  retries?: number,
  forcePost = false,
  expectJson = true,
): Promise<any> {
  return fetcher.fetchPlus(url, body, retries, forcePost, expectJson);
}

export function orderTranslations(translations: ProviderTranslationType[], orders: Record<string, number>) {
  return translations
    .filter((provider) => provider.posTranslations.length > 0 && provider.provider in orders)
    .slice()
    .sort((a, b) =>
      typeof orders[a.provider] === "undefined" || typeof orders[b.provider] === "undefined"
        ? 0
        : orders[a.provider] - orders[b.provider],
    );
}

export function isFakeL1(phone: string[], entry: string, fromLang: InputLanguage) {
  if (fromLang !== "zh-Hans") return false;

  const local_phone = unidecode(phone.join("").replace(/(\s+)/, "")).toLowerCase();
  // we DON'T do a entry.toLowerCase() because we DO want proper names, but proper names should always
  // be capitalised, so Xi Jingping, Huawei, etc. should be Ok.
  const potential = entry.replace(/(\s+)/, "");
  if (local_phone === potential) return true;
  if (`surname ${local_phone}` === potential.toLowerCase()) return true; // common in CCCedict
  return false;
}

export function affixCleaned(graph: string) {
  return graph.replace(/[^\p{L}\p{N}\p{Z}]+$/u, "").replace(/^[^\p{L}\p{N}\p{Z}]+/u, "");
}

export function cleanedSound(definition: DefinitionType, fromLang: InputLanguage) {
  switch (fromLang) {
    case "zh-Hans":
      if (definition.graph.length !== definition.sound.length) {
        return split(definition.sound.join(" "), true).filter((x) => x !== " ");
      } else {
        return definition.sound;
      }
    case "en":
      return definition.sound;
    default:
      throw new Error(`Unknown from language "${fromLang}", can't find sound`);
  }
}
