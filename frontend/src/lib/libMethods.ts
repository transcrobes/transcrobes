import unidecode from "unidecode";
import dayjs, { ManipulateType } from "dayjs";
import {
  DefinitionType,
  IDEAL_GLOSS_STRING_LENGTH,
  ImportAnalysis,
  InputLanguage,
  PosTranslationsType,
  ProviderTranslationType,
  PythonCounter,
  ReaderState,
  SerialisableStringSet,
  SIMPLE_POS_ENGLISH_NAMES,
  SimplePosType,
  TokenType,
  TreebankPosType,
  ZH_TB_POS_LABELS,
  ZH_TB_POS_TO_SIMPLE_POS,
  isTreebankPOS,
  isSimplePOS,
} from "./types";
import { DefinitionDocument } from "../database/Schema";
import { fetcher } from "./fetcher";
import { toEnrich } from "./funclib";

export function toSimplePos(pos: SimplePosType | TreebankPosType, fromLang: InputLanguage) {
  if (fromLang === "zh-Hans") {
    return isSimplePOS(pos) ? pos : ZH_TB_POS_TO_SIMPLE_POS[pos];
  }
  throw new Error(`Unknown from language "${fromLang}", can't find standard/simple POS`);
}

export function toPosLabels(pos: SimplePosType | TreebankPosType, fromLang: InputLanguage = "zh-Hans"): string {
  if (fromLang === "zh-Hans") {
    return isTreebankPOS(pos) ? ZH_TB_POS_LABELS[pos] : SIMPLE_POS_ENGLISH_NAMES[pos];
  }
  throw new Error(`Unknown from language "${fromLang}", can't find POS label`);
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

  const known = [];
  const wholeKnownWords = [];
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

function getFilteredBestGuess(others: string[], definition: DefinitionType, allDefs: PosTranslationsType[]) {
  let filteredDefs = filterFakeL1Definitions(others, definition.sound);
  if (filteredDefs.length) {
    return filteredDefs.sort(
      (a, b) => Math.abs(IDEAL_GLOSS_STRING_LENGTH - a.length) - Math.abs(IDEAL_GLOSS_STRING_LENGTH - b.length),
    )[0];
  }
  filteredDefs = filterFakeL1Definitions(
    allDefs.flatMap((p) => p.values),
    definition.sound,
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
  definition: DefinitionType,
  fromLang: InputLanguage,
  readerConfig: ReaderState,
): string {
  // FIXME: this is a ZH-HANS -> EN only hack, and needs to be architected eventually
  // something like what the Python has with distinct managers for each L2 -> L1. Later.
  let best = "";
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
        const filteredDefs = filterFakeL1Definitions(posEntry.values, definition.sound);
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
      return getFilteredBestGuess(others, definition, allDefs);
    }
  }
  return getFilteredBestGuess(others, definition, allDefs);
}

export function filterFakeL1Definitions(entries: string[], phone: string[]): string[] {
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

export function enrichChildren(
  root: HTMLElement,
  transcroberObserver: IntersectionObserver,
  fromLang: InputLanguage,
): void {
  textNodes(root).forEach((textNode) => {
    if (textNode.nodeValue && textNode.parentElement) {
      // FIXME: get this properly from the user!!!???
      if (!toEnrich(textNode.nodeValue, fromLang)) {
        console.log("Not enriching: " + textNode.nodeValue);
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

  const nodes = [];
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

export function complexPosToSimplePosLabels(pos: TreebankPosType, fromLang: InputLanguage): string {
  if (fromLang === "zh-Hans") {
    return SIMPLE_POS_ENGLISH_NAMES[ZH_TB_POS_TO_SIMPLE_POS[pos]];
  }
  throw new Error(`Unknown from language "${fromLang}", can't find simple POS label`);
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

export function shortMeaning(providerTranslations: ProviderTranslationType[]): string {
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

export function simpOnly(query: string, fromLang: InputLanguage): boolean {
  // eslint-disable-next-line no-control-regex
  return toEnrich(query, fromLang) && query === query.replace(/[\x00-\x7F]/g, "");
}

export function cleanAnalysis(
  analysis: ImportAnalysis,
  keepLang: InputLanguage = "zh-Hans",
): { [key: string]: string[] } {
  const buckets: { [key: string]: string[] } = {};
  for (const [key, value] of Object.entries(analysis.vocabulary.buckets)) {
    const vocab = value.filter((v) => toEnrich(v, keepLang));
    if (vocab.length > 0) {
      buckets[key] = vocab;
    }
  }
  return buckets;
}

export async function fetchPlus(url: string | URL, body?: BodyInit, retries?: number, forcePost = false): Promise<any> {
  return fetcher.fetchPlus(url, body, retries, forcePost);
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
