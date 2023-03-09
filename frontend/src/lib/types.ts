import { RaRecord, Identifier, UserIdentity } from "react-admin";
import { HslColor } from "react-colorful";

import { CardDocument, CharacterDocument, DefinitionDocument, WordModelStatsDocument } from "../database/Schema";
import type { ProgressCallbackMessage, ServiceWorkerProxy } from "./proxies";

export const SUBS_DATA_SUFFIX = ".data.json";

export const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60; // default is only a week
export const WEBPUB_CACHE_NAME = "webpub-cache";
export const PRECACHE_PUBLICATIONS = "PRECACHE_PUBLICATIONS";
export const IS_DEV = import.meta.env.DEV;
export const IS_EXT = import.meta.env.PLATFORM === "extension";
export const DOCS_DOMAIN = import.meta.env.VITE_DOCS_DOMAIN || "localhost:1313";
export const SITE_DOMAIN = import.meta.env.VITE_SITE_DOMAIN || "localhost";
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "admin@example.com")
  .split(",")
  .map((x: string) => x.trim());

export const MIN_ACTIVITY_LENGTH = 5000; // ms, apart from notrobes, could maybe be more, like 10k, 20k

export const DEFINITION_LOADING = "loading...";

export const LOCALES: { locale: SystemLanguage; name: string }[] = [
  { locale: "en", name: "English" },
  { locale: "zh-Hans", name: "中文" },
];

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

export type DNDItemType = {
  id: string;
  name: string;
};

export interface StyleProps {
  segmentationPadding: string;
  clickable: boolean;
  glossPosition: GlossPosition;
  glossFontSize: string;
  glossFontColour: string;
  verticalAlign: string;
  fontColour: string;
}

// From inferno, but not usable???
// enum VNodeFlags {
//   HtmlElement = 1,
//   ComponentUnknown = 2,
//   ComponentClass = 4,
//   ComponentFunction = 8,
//   Text = 16,
//   SvgElement = 32,
//   InputElement = 64,
//   TextareaElement = 128,
//   SelectElement = 256,
//   Void = 512,
//   Portal = 1024,
//   ReCreate = 2048,
//   ContentEditable = 4096,
//   Fragment = 8192,
//   InUse = 16384,
//   ForwardRef = 32768,
//   Normalized = 65536,
//   ForwardRefComponent = 32776,
//   FormElement = 448,
//   Element = 481,
//   Component = 14,
//   DOMRef = 2033,
//   InUseOrNormalized = 81920,
//   ClearInUse = -16385,
//   ComponentKnown = 12,
// }
// enum ChildFlags {
//   UnknownChildren = 0,
//   HasInvalidChildren = 1,
//   HasVNodeChildren = 2,
//   HasNonKeyedChildren = 4,
//   HasKeyedChildren = 8,
//   HasTextChildren = 16,
//   MultipleChildren = 12,
// }

export const ComponentClass = 4;
export const ComponentFunction = 8;

export const HtmlElement = 1;
export const HasVNodeChildren = 2;

export const MultipleChildren = 12;
export const HasTextChildren = 16;

export const API_PREFIX = "/api/v1";
export const DEFAULT_RETRIES = 3;
export const UNSURE_ATTRIBUTE = "data-unsure";
export const EVENT_QUEUE_PROCESS_FREQ = IS_DEV ? 5000 : 30000; //milliseconds
export const ACTIVITY_QUEUE_PROCESS_FREQ = 30000; // IS_DEV ? 5000 : 30000; //milliseconds
export const GLOBAL_TIMER_DURATION_MS = 5000; // IS_DEV ? 2000 : 5000;
export const REQUEST_QUEUE_PROCESS_FREQ = IS_DEV ? 5000 : 30000; //milliseconds
export const PUSH_FILES_PROCESS_FREQ = IS_DEV ? 5000 : 30000; //milliseconds
export const ONSCREEN_DELAY_IS_CONSIDERED_READ = 5000; // milliseconds
export const IDEAL_GLOSS_STRING_LENGTH = 5; // pretty random but https://arxiv.org/pdf/1208.6109.pdf
export const POPOVER_MIN_LOOKED_AT_EVENT_DURATION = 1500; // milliseconds
export const POPOVER_MIN_LOOKED_AT_SOUND_DURATION = 750; // milliseconds

export const MAX_IMPORT_SIZE_BYTES = 15_000_000;
export const MIN_KNOWN_BEFORE_ADVANCED = 500;
export const MIN_LENGTH_FOR_SENTENCE = 5;
export const ACTIVITY_TIMEOUT = 180_000; // milliseconds
export const ACTIVITY_DEBOUNCE = 1_000; // milliseconds
export const ACTIVITY_EVENTS_THROTTLE = 500; // milliseconds

export const YOUTUBE_CHANNEL = "https://www.youtube.com/channel/UCEXMQOmPKNM1wIWZb3ceG-A";
export const SIGNUP_YT_VIDEO = "https://youtu.be/XwZNzFw51lA";
export const BROCROBES_YT_VIDEO = "https://youtu.be/bKLxXEml_sA";
export const IMPORTS_YT_VIDEO = "https://youtu.be/w7OhcIU-WAM";
export const USERLISTS_YT_VIDEO = "https://youtu.be/Q5h0HcgY0j4";
export const NOTROBES_YT_VIDEO = "https://youtu.be/9AfRj55RcEE";
export const LISTROBES_YT_VIDEO = "https://youtu.be/l3zKi-J6coU";
export const REPETROBES_YT_VIDEO = "https://youtu.be/BADUoTtrML0";
export const TEXTCROBES_YT_VIDEO = "https://youtu.be/TUskK-mtz_c";
export const MOOCROBES_YT_VIDEO = "https://youtu.be/eHGY8JtRGH4";
export const BOOCROBES_YT_VIDEO = "https://youtu.be/-TDHhtdP-Xk";

export const BROCROBES_WEB_STORE_URL =
  "https://chrome.google.com/webstore/detail/brocrobes/akeangohpdjllngpjiodmebgfhejbbpo?hl=en-GB";

// Boocrobes, required in many places
export const BOOCROBES_HEADER_HEIGHT = 48;
export const ReadiumWebpubContext = "http://readium.org/webpub/default.jsonld";

export type PublicationConfig = {
  manifestUrl: string;
  proxyUrl?: string;
  // users can pass in a list of additonal urls
  // we will route with a stale-while-revalidate
  // strategy. Useful in CPW for the heavy fulfillment link.
  swrUrls?: string[];
};

export const SYSTEM_LANG_TO_LOCALE = {
  "zh-Hans": "zh-CN",
  en: "en-GB",
};

export type SystemLanguage = "en" | "zh-Hans";
export type KnownLanguage = SystemLanguage;
export type InputLanguage = SystemLanguage;
export type CornerPosition = "none" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const SIMPLE_POS_VALUES = ["ADV", "OTHER", "CONJ", "DET", "NOUN", "VERB", "PREP", "PRON", "ADJ", "MODAL"] as const;
const SIMPLE_POS_VALUES_OBJ = SIMPLE_POS_VALUES.reduce(
  (acc, next) => ({ ...acc, [next]: null }),
  {} as Record<string, null>,
);
export type SimplePosType = typeof SIMPLE_POS_VALUES[number];

export function isSimplePOS(value: string): value is SimplePosType {
  return value in SIMPLE_POS_VALUES_OBJ;
}

const EN_TREEBANK_POS_VALUES = [
  "PU",
  "ADD",
  "AFX",
  "GW",
  "HYPH",
  "NFP",
  "XX",
  "CC",
  "CD",
  "DT",
  "EX",
  "FW",
  "IN",
  "JJ",
  "JJR",
  "JJS",
  "LS",
  "MD",
  "NN",
  "NNS",
  "NNP",
  "NNPS",
  "PDT",
  "POS",
  "PRP",
  "PRP$",
  "RB",
  "RBR",
  "RBS",
  "RP",
  "SYM",
  "TO",
  "UH",
  "VB",
  "VBD",
  "VBG",
  "VBN",
  "VBP",
  "VBZ",
  "WDT",
  "WP",
  "WP$",
  "WRB",
] as const;

const ZH_TREEBANK_POS_VALUES = [
  "AD",
  "AS",
  "BA",
  "CC",
  "CD",
  "CS",
  "DEC",
  "DEG",
  "DER",
  "DEV",
  "DT",
  "ETC",
  "FW",
  "IJ",
  "JJ",
  "LB",
  "LC",
  "M",
  "MSP",
  "NN",
  "NR",
  "NT",
  "OD",
  "ON",
  "P",
  "PN",
  "PU",
  "SB",
  "SP",
  "VA",
  "VC",
  "VE",
  "VV",
  "URL",
] as const;
const EN_TREEBANK_POS_VALUES_OBJ = EN_TREEBANK_POS_VALUES.reduce(
  (acc, next) => ({ ...acc, [next]: null }),
  {} as Record<string, null>,
);
const ZH_TREEBANK_POS_VALUES_OBJ = ZH_TREEBANK_POS_VALUES.reduce(
  (acc, next) => ({ ...acc, [next]: null }),
  {} as Record<string, null>,
);
export type EnTreebankPosType = typeof EN_TREEBANK_POS_VALUES[number];
export type ZhTreebankPosType = typeof ZH_TREEBANK_POS_VALUES[number];

export type AnyPosType = EnTreebankPosType | ZhTreebankPosType | SimplePosType;
export type AnyTreebankPosType = EnTreebankPosType | ZhTreebankPosType;

export function isEnTreebankPOS(value: string): value is EnTreebankPosType {
  return value in EN_TREEBANK_POS_VALUES_OBJ;
}
export function isZhTreebankPOS(value: string): value is ZhTreebankPosType {
  return value in ZH_TREEBANK_POS_VALUES_OBJ;
}
export type WordOrdering = "Natural" | "WCPM" | "Personal";

export type ActivityType = "start" | "end" | "continue";

export type ActivitySource = "readium" | "web" | "extension";

export interface SessionType {
  id: string;
  timestamp: number; // last active timestamp
}

// FIXME: these types are badly named
export interface UserActivityType {
  id: string;
  asessionId: string;
  timestamp: number;
  activityType: ActivityType;
  activitySource: ActivitySource;
  url: string;
}

export interface UserActivity {
  end: number;
  start: number;
  type: "activity";
  url: string;
}

export const USER_DEFINITION_SOUND_SEPARATOR = " ";

export const EN_TB_POS_TO_SIMPLE_POS: { [key in EnTreebankPosType]: SimplePosType } = {
  PU: "OTHER", // punctuation
  ADD: "OTHER", // ???
  AFX: "OTHER", // affix
  HYPH: "OTHER", // ???
  GW: "OTHER", // "goes with"???
  NFP: "OTHER", // ???
  XX: "OTHER", // absolutely no idea what this is
  CC: "CONJ", // Coordinating conjunction
  CD: "DET", // Cardinal number
  DT: "DET", // Determiner
  EX: "OTHER", // Existential _there_
  FW: "OTHER", // Foreign word
  IN: "PREP", // Preposition or subordinating conjunction
  JJ: "ADJ", // Adjective
  JJR: "ADJ", // Adjective, comparative
  JJS: "ADJ", // Adjective, superlative
  LS: "OTHER", // List item marker
  MD: "OTHER", // Modal
  NN: "NOUN", // Noun, singular or mass
  NNS: "NOUN", // Noun, plural
  NNP: "NOUN", // Proper noun, singular
  NNPS: "NOUN", // Proper noun, plural
  PDT: "DET", // Predeterminer
  POS: "OTHER", // Possessive ending
  PRP: "PRON", // Personal pronoun
  PRP$: "PRON", // Possessive pronoun
  RB: "ADV", // Adverb
  RBR: "ADV", // Adverb, comparitive
  RBS: "ADV", // Adverb, superlative
  RP: "OTHER", // Particle
  SYM: "OTHER", // Symbol
  TO: "PREP", // _to_
  UH: "OTHER", // Interjection
  VB: "VERB", // Verb, base form
  VBD: "VERB", // Verb, past tense
  VBG: "VERB", // Verb, gerund or present participle
  VBN: "VERB", // Verb, past participle
  VBP: "VERB", // Verb, non-3rd person singular present
  VBZ: "VERB", // Verb, 3rd person singular present
  WDT: "DET", // Wh-determiner
  WP: "PRON", // Wh-pronoun
  WP$: "PRON", // Possessive wh-pronoun
  WRB: "ADV", // Wh-adverb
};

export const ZH_TB_POS_TO_SIMPLE_POS: { [key in ZhTreebankPosType]: SimplePosType } = {
  // see src/app/zhhans/__init__.py for more details, if that is updated, then this should be too
  // TODO: consider getting/updating this via the API, to guarantee python and js always agree
  AD: "ADV", // adverb
  AS: "OTHER", // aspect marker
  BA: "OTHER", // in ba-construction ,
  CC: "CONJ", // coordinating conjunction
  CD: "DET", // cardinal number
  CS: "CONJ", // subordinating conjunction
  DEC: "OTHER", // in a relative-clause
  DEG: "OTHER", // associative
  DER: "OTHER", // in V-de const. and V-de-R
  DEV: "OTHER", // before VP
  DT: "DET", // determiner
  ETC: "OTHER", // for words , ,
  FW: "OTHER", // foreign words
  IJ: "OTHER", // interjection
  JJ: "ADJ", // other noun-modifier ,
  LB: "OTHER", // in long bei-const ,
  LC: "OTHER", // localizer
  M: "OTHER", // measure word
  MSP: "OTHER", // other particle
  NN: "NOUN", // common noun
  NR: "NOUN", // proper noun
  NT: "NOUN", // temporal noun
  OD: "DET", // ordinal number
  ON: "OTHER", // onomatopoeia ,
  P: "PREP", // preposition excl. and
  PN: "PRON", // pronoun
  PU: "OTHER", // punctuation
  SB: "OTHER", // in short bei-const ,
  SP: "OTHER", // sentence-final particle
  VA: "ADJ", // predicative adjective
  VC: "VERB", // copula verb
  VE: "VERB", // as the main verb
  VV: "VERB", // other verb
  // Others added since then
  URL: "OTHER",
};

export const USER_STATS_MODE = {
  IGNORE: -1,
  UNMODIFIED: 0,
  NO_GLOSS: 2, // segmented
  L2_SIMPLIFIED: 4, // e.g, using "simple" Chinese characters
  TRANSLITERATION: 6, // e.g, pinyin
  L1: 8, // e.g, English
  TRANSLITERATION_L1: 9, // e.g, pinyin + English
};
// FIXME: turn into config, this is likely only useful for Chinese
export const SEGMENTED_BASE_PADDING = 6;

export type USER_STATS_MODE_KEY = keyof typeof USER_STATS_MODE;

export type USER_STATS_MODE_KEY_VALUES = typeof USER_STATS_MODE[USER_STATS_MODE_KEY];

export const SIMPLE_POS_ENGLISH_NAMES: { [key in SimplePosType]: string } = {
  NOUN: "Noun",
  VERB: "Verb",
  ADJ: "Adjective",
  ADV: "Adverb",
  PREP: "Preposition",
  PRON: "Pronoun",
  CONJ: "Conjunction",
  DET: "Determiner",
  MODAL: "Modal",
  OTHER: "Other",
};

export const SIMPLE_POS_CHINESE_NAMES: { [key in SimplePosType]: string } = {
  NOUN: "名词",
  VERB: "动词",
  ADJ: "形容词",
  ADV: "副词",
  PREP: "介词",
  PRON: "代词",
  CONJ: "连词",
  DET: "限定词",
  MODAL: "情态词",
  OTHER: "其他",
};

export const BASE_DICT_PROVIDERS = {
  mst: "Bing",
  fbk: "Bing fallback",
};
export const EN_ZHHANS_DICT_PROVIDERS = {
  ...BASE_DICT_PROVIDERS,
};
export const ZHHANS_EN_DICT_PROVIDERS = {
  ...BASE_DICT_PROVIDERS,
  ccc: "CC Cedict",
};
// unused
// export type ZHHansEnDictProvider = keyof typeof ZHHANS_EN_DICT_PROVIDERS;
// export type EnZHHansDictProvider = keyof typeof EN_ZHHANS_DICT_PROVIDERS;
// export type DictProvider = ZHHansEnDictProvider | EnZHHansDictProvider;

// FIXME: This shouldn't be here...
export const EN_TB_POS_LABELS_ZH: { [key in EnTreebankPosType]: string } = {
  PU: "标点",
  ADD: "其他",
  AFX: "词缀",
  HYPH: "连字符",
  GW: "随之而来",
  XX: "其他",
  NFP: "其他",
  CC: "协调连词",
  CD: "基数",
  DT: "决定者",
  EX: "存在的_there_",
  FW: "外来词",
  IN: "介词或从属连词",
  JJ: "形容词",
  JJR: "形容词,比较级",
  JJS: "形容词,最高级",
  LS: "列表项标记",
  MD: "模态",
  NN: "名词,单数或质量",
  NNS: "名词,复数",
  NNP: "专有名词,单数",
  NNPS: "专有名词,复数",
  PDT: "预定者",
  POS: "所有格结尾",
  PRP: "人称代词",
  PRP$: "所有格代词",
  RB: "副词",
  RBR: "副词,比较",
  RBS: "副词,最高级",
  RP: "粒子",
  SYM: "符号",
  TO: "_to_",
  UH: "欹",
  VB: "动词,基本形式",
  VBD: "动词,过去时",
  VBG: "动词、动名词或现在分词",
  VBN: "动词,过去分词",
  VBP: "动词,非第三人称单数现在时",
  VBZ: "动词,第三人称单数现在时",
  WDT: "Wh-确定器",
  WP: "Wh-代词",
  WP$: "所有格 wh-代词",
  WRB: "Wh-副词",
};

export const EN_TB_POS_LABELS: { [key in EnTreebankPosType]: string } = {
  PU: "Punctuation",
  ADD: "Other",
  AFX: "Affix",
  GW: "Goes with",
  XX: "Other",
  HYPH: "hyphen",
  NFP: "Other",
  CC: "Coordinating conjunction",
  CD: "Cardinal number",
  DT: "Determiner",
  EX: "Existential _there_",
  FW: "Foreign word",
  IN: "Preposition or subordinating conjunction",
  JJ: "Adjective",
  JJR: "Adjective, comparative",
  JJS: "Adjective, superlative",
  LS: "List item marker",
  MD: "Modal",
  NN: "Noun, singular or mass",
  NNS: "Noun, plural",
  NNP: "Proper noun, singular",
  NNPS: "Proper noun, plural",
  PDT: "Predeterminer",
  POS: "Possessive ending",
  PRP: "Personal pronoun",
  PRP$: "Possessive pronoun",
  RB: "Adverb",
  RBR: "Adverb, comparitive",
  RBS: "Adverb, superlative",
  RP: "Particle",
  SYM: "Symbol",
  TO: "_to_",
  UH: "Interjection",
  VB: "Verb, base form",
  VBD: "Verb, past tense",
  VBG: "Verb, gerund or present participle",
  VBN: "Verb, past participle",
  VBP: "Verb, non-3rd person singular present",
  VBZ: "Verb, 3rd person singular present",
  WDT: "Wh-determiner",
  WP: "Wh-pronoun",
  WP$: "Possessive wh-pronoun",
  WRB: "Wh-adverb",
};

// FIXME: This shouldn't be here...
export const ZH_TB_POS_LABELS_ZH: { [key in ZhTreebankPosType]: string } = {
  AD: "副词", // adverb
  AS: "方面标记", // aspect marker
  BA: "把", // in ba-construction ,
  CC: "并列连词", // coordinating conjunction
  CD: "基数", // cardinal number
  CS: "从属连词", // subordinating conjunction
  DEC: "的-关系从句", // in a relative-clause
  DEG: "的-联想", // associative
  DER: "的-动词-的-结果", // in V-de const. and V-de-R
  DEV: "的-动词前", // before VP
  DT: "限定词", // determiner
  ETC: "“等”标记", // for words , ,
  FW: "外来词", // foreign words
  IJ: "欹", // interjection
  JJ: "形容词", // other noun-modifier ,
  LB: "长的“被”", // in long bei-const ,
  LC: "定位器", // localizer
  M: "量词", // measure word
  MSP: "其他词粒子", // other particle
  NN: "普通名词", // common noun
  NR: "专有名词", // proper noun
  NT: "时间名词", // temporal noun
  OD: "序数词", // ordinal number
  ON: "象声词", // onomatopoeia ,
  P: "介词（不包括“和”）", // preposition excl. and
  PN: "代词", // pronoun
  PU: "标点", // punctuation
  SB: "短的“被”", // in short bei-const ,
  SP: "词尾粒子", // sentence-final particle
  VA: "表语形容词", // predicative adjective
  VC: "系动词",
  VE: "“有”作为主要动词", // as the main verb
  VV: "其他动词", // other verb
  // Others added since then
  URL: "网址",
};

export const ZH_TB_POS_LABELS_EN: { [key in ZhTreebankPosType]: string } = {
  AD: "Adverb", // adverb
  AS: "Aspect Marker", // aspect marker
  BA: "BA-construction", // in ba-construction ,
  CC: "Coordinating conjunction", // coordinating conjunction
  CD: "Cardinal number", // cardinal number
  CS: "Subordinating conjunction", // subordinating conjunction
  DEC: "DE-relative clause", // in a relative-clause
  DEG: "DE-associative", // associative
  DER: "DE-V-de-R", // in V-de const. and V-de-R
  DEV: "DE-before verb", // before VP
  DT: "Determiner", // determiner
  ETC: '"etc" marker', // for words , ,
  FW: "Foreign word", // foreign words
  IJ: "Interjection", // interjection
  JJ: "Adjective", // other noun-modifier ,
  LB: 'Long "BEI"', // in long bei-const ,
  LC: "Localizer", // localizer
  M: "Measure word", // measure word
  MSP: "Other particle", // other particle
  NN: "Common noun", // common noun
  NR: "Proper noun", // proper noun
  NT: "Temporal noun", // temporal noun
  OD: "Ordinal number", // ordinal number
  ON: "Onomatopoeia", // onomatopoeia ,
  P: 'Preposition (excl "and")', // preposition excl. and
  PN: "Pronoun", // pronoun
  PU: "Punctuation", // punctuation
  SB: 'Short "BEI"', // in short bei-const ,
  SP: "Phrase-final particle", // sentence-final particle
  VA: "Predicative adjective", // predicative adjective
  VC: "Copula verb",
  VE: "YOU as main verb", // as the main verb
  VV: "Other verb", // other verb
  // Others added since then
  URL: "URL",
};

export const GLOSS_NUMBER_NOUNS = false;

export type GlossPosition = "row" | "column-reverse" | "column" | "row-reverse";

export type PopupPosition = {
  left: string;
  top: string;
  height?: string;
  visibility?: "visible" | "hidden";
};
export type EventCoordinates = {
  eventX: number;
  eventY: number;
};

export type FontFamily = "Original" | "serif" | "sans-serif" | "opendyslexic" | "monospace";

export type FontFamilyChinese = "notasanslight" | "notaserifextralight" | "notaserifregular" | "mashanzheng";

export interface GenericState<T extends ReaderState> {
  [key: string]: T;
}

export const BOOK_READER_TYPE = "bookReader";
export const EXTENSION_READER_TYPE = "extensionReader";
export const SIMPLE_READER_TYPE = "simpleReader";
export const VIDEO_READER_TYPE = "videoReader";

export type ReaderType = "bookReader" | "extensionReader" | "simpleReader" | "videoReader";

export const TEXT_READER_ID = "textReader";
export const WEB_READER_ID = "webReader";
export const RECENTS_READER_ID = "recentsReader";
export const EXTENSION_READER_ID = "extensionReader";

export interface ReaderState {
  id: string;
  readerType: ReaderType;
  fontColour: HslColor | null;
  fontFamilyGloss: FontFamily | FontFamilyChinese;
  fontFamilyMain: FontFamily | FontFamilyChinese;
  fontSize: number;
  glossFontSize: number;
  glossFontColour: HslColor | null;
  glossUnsureBackgroundColour: HslColor | null;
  glossPosition: GlossPosition;
  glossing: USER_STATS_MODE_KEY_VALUES;
  segmentation: boolean;
  collectRecents: boolean;
  mouseover: boolean;
  sayOnMouseover: boolean;
  clickable: boolean;
  translationProviderOrder: Record<string, number>;
  strictProviderOrdering: boolean;
}

export interface LanguagedReaderState extends ReaderState {
  scriptioContinuo: boolean;
}

export interface BookReaderState extends ReaderState {
  fontColour: HslColor | null;
  pageMargins: number;
  isScrolling: boolean;
  currentTocUrl: string | null;
  atStart: boolean;
  atEnd: boolean;
  // location?: Locator | undefined;
  location?: any | undefined;
  readerType: typeof BOOK_READER_TYPE;
}

export const DEFAULT_READER_CONFIG_STATE: ReaderState = {
  id: "simpleReader",
  readerType: "simpleReader",
  fontFamilyGloss: "Original",
  fontFamilyMain: "Original",
  fontSize: 1,
  fontColour: null,
  glossFontSize: 0.9,
  glossFontColour: { h: 240, s: 100, l: 70 },
  glossUnsureBackgroundColour: null,
  glossPosition: "row",
  glossing: USER_STATS_MODE.L1,
  segmentation: true,
  collectRecents: true,
  mouseover: true,
  sayOnMouseover: false,
  clickable: true,
  translationProviderOrder: Object.keys(BASE_DICT_PROVIDERS).reduce(
    (acc, next, ind) => ({ ...acc, [next]: ind }),
    {} as Record<string, number>,
  ),
  strictProviderOrdering: false,
};

export const DEFAULT_BOOK_READER_CONFIG_STATE: BookReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: "",
  readerType: BOOK_READER_TYPE,
  pageMargins: 1,
  isScrolling: false,
  currentTocUrl: null,
  atStart: true,
  atEnd: false,
  location: undefined,
};

export interface ExtensionReaderState extends ReaderState {
  showSuggestions: boolean;
  analysisPosition: CornerPosition;
  themeName: ThemeName;
  readerType: typeof EXTENSION_READER_TYPE;
}

export const DEFAULT_EXTENSION_READER_CONFIG_STATE: ExtensionReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: EXTENSION_READER_ID,
  showSuggestions: true,
  analysisPosition: "top-right",
  themeName: "light",
  readerType: EXTENSION_READER_TYPE,
};

export interface SimpleReaderState extends ReaderState {
  readerType: typeof SIMPLE_READER_TYPE;
}

export const DEFAULT_WEB_READER_CONFIG_STATE: SimpleReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: WEB_READER_ID,
  readerType: SIMPLE_READER_TYPE,
};

export const DEFAULT_TEXT_READER_CONFIG_STATE: SimpleReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: TEXT_READER_ID,
  readerType: SIMPLE_READER_TYPE,
};

export const DEFAULT_RECENTS_READER_CONFIG_STATE: SimpleReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: RECENTS_READER_ID,
  readerType: SIMPLE_READER_TYPE,
  clickable: false,
  glossing: USER_STATS_MODE.NO_GLOSS,
  segmentation: true,
  collectRecents: false,
  mouseover: true,
};

// "above" ?
export type SubPosition = "top" | "bottom" | "under";

export type TimeDisplayFormat = "remaining" | "normal";

export interface VideoReaderState extends ReaderState {
  volume: number;
  played: number;
  muted: boolean;
  timeDisplayFormat: TimeDisplayFormat;
  playbackRate: number;
  subPlaybackRate: number;
  subBoxWidth: number;
  subDelay: number;
  subPosition: SubPosition;
  readerType: typeof VIDEO_READER_TYPE;
}

export const DEFAULT_VIDEO_READER_CONFIG_STATE: VideoReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: "",
  fontSize: 1.5,
  fontColour: { h: 0, s: 0, l: 100 },
  glossFontColour: { h: 0, s: 0, l: 100 },
  playbackRate: 1.0,
  subPlaybackRate: 1.0,
  subBoxWidth: 0.8,
  subDelay: 0,
  subPosition: "bottom",
  volume: 1,
  played: 0,
  timeDisplayFormat: "normal",
  muted: false,
  readerType: VIDEO_READER_TYPE,
};

export interface ComponentsAppConfig extends ReaderState {
  username?: string;
  popupParent: HTMLElement;
  reloadConfig: boolean;
}

export interface UserDetails extends UserIdentity {
  accessToken: string;
  isAdmin: boolean;
  refreshToken: string;
  trackingKey: string;
  trackingEndpoint: string;
  translationProviders: string[];
  username: string;
  fromLang: InputLanguage;
  toLang: InputLanguage;
  isTeacher: boolean;
}

export interface UserState {
  user: UserDetails;
  username: string;
  password: string;
  baseUrl: string;
  showResearchDetails: boolean;
  success: boolean;
  error: boolean;
}
export const DEFAULT_USER: UserDetails = {
  accessToken: "",
  isAdmin: false,
  refreshToken: "",
  trackingKey: "",
  trackingEndpoint: "",
  translationProviders: [],
  username: "",
  id: "",
  fromLang: "zh-Hans",
  toLang: "en",
  isTeacher: false,
};

export const INITIAL_USERSTATE: UserState = {
  user: DEFAULT_USER,
  username: "",
  password: "",
  baseUrl: "",
  showResearchDetails: false,
  success: false,
  error: false,
};

export type SegmentationType = "segmented" | "none";
export type MouseoverType = "mouseover" | "none";

export enum PROCESSING {
  NONE = 0,
  REQUESTED = 1,
  PROCESSING = 2,
  FINISHED = 3,
  ERROR = 4,
}

// each logging line will be prepended with the service worker version
function dolog(
  level: "log" | "warn" | "error" | "debug" = "log",
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  ...rest: any
): void {
  if (IS_DEV) console[level](`MAIN -`, ...rest);
}

export function warn(...rest: any): void {
  dolog("warn", ...rest);
}

export function error(...rest: any): void {
  dolog("error", ...rest);
}

export function debug(...rest: any): void {
  dolog("debug", ...rest);
}

export function log(...rest: any): void {
  dolog("log", ...rest);
}

export enum STATUS {
  INACTIVE = 0,
  ACTIVE = 1,
}

export enum CONTENT_TYPE {
  BOOK = 1,
  VIDEO = 2,
}

export enum PROCESS_TYPE {
  VOCABULARY_ONLY = 1,
  GRAMMAR_ONLY = 2,
  VOCABULARY_GRAMMAR = 3,
}

export enum ORDER_BY {
  ABSOLUTE_FREQUENCY = 0, // "Absolute Frequency"
  IMPORT_FREQUENCY = 1, // "Frequency in import"
}

export type ContentParams = {
  id: string;
};

export type ContentProps = {
  proxy: ServiceWorkerProxy;
};

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function reverseEnum(enume: any, value: any): string {
  const reversed = Object.entries(enume)
    .filter(([_k, v]) => v === value)[0][0]
    .replace("_", " ")
    .split(" ");
  return reversed.map((s: string) => capitalise(s)).join(" ");
}

export type ThemeName = "light" | "dark";

export const APPLICATION_NAMES = ["repetrobes", "listrobes", "notrobes", "brocrobes"] as const;
export type TCApplication = typeof APPLICATION_NAMES[number];

export interface ActionEventData {
  target_word: string;
  target_sentence: string;
}
export interface VocabEventData {
  target_word: string;
  target_sentence: string;
}
export interface CardEventData {
  target_word: string;
  target_sentence: string;
}

interface Event {
  type: string;
  data: ActionEventData | VocabEventData | CardEventData;
  source: string;
  userStatsMode: number;
}

export interface ActionEvent extends Event {}
export interface VocabEvent extends Event {}
export interface CardEvent extends Event {}

export type EventQueueType = {
  id: string;
  eventString: string;
};

export type RequestQueueType = {
  id: string;
  type: "registration";
  endpoint: "/api/v1/users/register_classes";
  requestString: string;
};

export interface CommonRecord extends RaRecord {
  title: string;
  description?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt?: number;
  updatedAt?: number;

  status?: number;
  activateDate?: number;
  deactivateDate?: number;
}

export interface SurveyType extends CommonRecord {
  surveyJson: string;
  isObligatory: boolean;
}

export interface UserSurvey extends CommonRecord {
  surveyId: string;
  data: string;
}

export interface Survey extends SurveyType, UserSurvey {}

export interface Goal extends CommonRecord {
  userList: Identifier;
  parent: Identifier;
  priority: number;
}

export interface UserList extends CommonRecord {
  theImport: string;
  shared: boolean;
  nbToTake: number;
  orderBy: number;
  onlyDictionaryWords: boolean;
  minimumDocFrequency: number;
  minimumAbsFrequency: number;
  wordsAreKnown: boolean;
  processing: number;
}

export interface Import extends CommonRecord {
  processType: number;
  processing: number;
  importFile: string;
  analysis: string;
  shared: boolean;
}

export interface Content extends CommonRecord {
  processing: number;
  theImport: string;
  contentType: number;
  author: string;
  cover: string;
  lang: string;
  shared: boolean;
}

export interface UserDictionary extends CommonRecord {
  lzContent: string; // LZ-String content, see https://github.com/pieroxy/lz-string
  processing: number; //???
  langPair: string;
  shared: boolean;
}

export type PracticeDetailsType = {
  wordInfo: DefinitionType;
  grade: number;
};

export type ContentConfigType = {
  id: string;
  configString: string;
};

export interface SuperMemoType {
  interval: number;
  repetition: number;
  efactor: number;
}

export interface CardType extends SuperMemoType {
  id: string;
  dueDate: number;
  front?: string;
  back?: string;
  suspended: boolean;
  known: boolean;
  firstRevisionDate: number;
  lastRevisionDate: number;
  firstSuccessDate: number;
  updatedAt: number;
}

export type ExportDetails = {
  nbSeen: number;
  nbSeenSinceLastCheck: number;
  lastSeen: number;
  dueDate: number;
  nbChecked: number;
  lastChecked: number;
  firstRevisionDate: number;
  lastRevisionDate: number;
  firstSuccessDate: number;
};

export const DefaultExportDetails: ExportDetails = {
  firstRevisionDate: 0,
  firstSuccessDate: 0,
  lastChecked: 0,
  lastRevisionDate: 0,
  lastSeen: 0,
  dueDate: 0,
  nbChecked: 0,
  nbSeen: 0,
  nbSeenSinceLastCheck: 0,
};
export const EMPTY_CARD: CardType = {
  id: "",
  interval: 0,
  repetition: 0,
  efactor: 0,
  dueDate: 0,
  suspended: false,
  known: false,
  firstRevisionDate: 0,
  lastRevisionDate: 0,
  firstSuccessDate: 0,
  updatedAt: 0,
};

export type ClassRegistrationRequest = {
  email: string;
  class_id: string;
  is_teacher?: boolean;
};

type PosValuesType = {
  posTag: AnyPosType;
  values: string[];
};

export type SynonymType = PosValuesType;

export type PosTranslationsType = PosValuesType & {
  sounds?: string;
};

export type ProviderTranslationType = {
  provider: string;
  posTranslations: PosTranslationsType[];
};

export type DefinitionState = DefinitionType & {
  glossToggled: boolean;
};

export interface DefinitionsState {
  [key: string]: DefinitionState;
}

export type UserDefinitionType = {
  id: string; // this is the graph, we use this so it is compatible with react-admin infra
  translations: PosTranslationsType[];
  sounds?: string;
};

//{"pinyin": "de/dí/dì", "wcpm": "50155.13", "wcdp": "100", "pos": ".u.n.", "pos_freq": ".1682369.161."}
export type FrequencyType = {
  wcpm: string;
  wcdp: string;
  pos: string;
  pos_freq: string;
};

export type DefinitionType = {
  id: string;
  graph: string;
  updatedAt: number;
  sound: string[];
  synonyms: SynonymType[];
  providerTranslations: ProviderTranslationType[];
  frequency: FrequencyType;
  hsk: { levels: number[] };
};

export type WordlistType = {
  id: string;
  name: string;
  default: boolean;
  wordIds: string[];
  updatedAt: number;
};

export type HanziWriterStructure = {
  medians: number[][][];
  radStrokes: number[];
  strokes: string[];
};

export type ShortWord = { id: string; sounds: string[]; isDict: boolean };
export type ShortChar = { id: string; radical: string };

export type CharacterType = {
  id: string;
  updatedAt: number;
  pinyin: string[];
  decomposition: string;
  radical: string;
  etymology?: {
    type: "ideographic" | "pictographic" | "pictophonetic";
    hint?: string;
    phonetic?: string;
    semantic?: string;
  };
  structure: HanziWriterStructure;
};

// FIXME: these types should never be seen outside data.ts...
export type WordDetailsRxType = {
  word: DefinitionDocument | null;
  cards: Map<string, CardDocument>;
  characters: Map<string, CharacterDocument>;
  recentPosSentences: PosSentences | null;
  wordModelStats: WordModelStatsDocument | null;
};

export type WordDetailsType = {
  word: DefinitionType | null;
  cards: CardType[];
  characters: (CharacterType | null)[];
  wordModelStats: WordModelStatsType | null;
  recentPosSentences: PosSentences | null;
};

export type WordListNamesType = {
  [key: string]: string;
};

export type UserListPositionType = {
  listId: string;
  position: number;
};

export interface ExtendedActionProps {
  noEdit?: boolean;
  helpUrl: string;
  helpLabel?: string;
  ytUrl?: string;
}

export type UserListWordType = { [key: string]: UserListPositionType[] };

export type SelectableListElementType = {
  label: string;
  value: string;
  selected: boolean;
};

export type SortableListElementType = {
  listId: string;
  name: string;
  position: number;
};

export type RepetrobesActivityConfigType = {
  badReviewWaitSecs: number;
  maxNew: number;
  maxRevisions: number;
  newCardOrdering: WordOrdering;
  dayStartsHour: number;
  systemWordSelection: boolean;
  wordLists?: SelectableListElementType[];
  todayStarts: number;
  onlySelectedWordListRevisions: boolean;
  showProgress: boolean;
  showRecents: boolean;
  showSynonyms: boolean;
  showNormalFont: boolean;
  showL2LengthHint: boolean;
  activeCardTypes?: SelectableListElementType[];
  translationProviderOrder?: Record<string, number>;
};

export type DayModelStatsType = {
  id: string;
  nbSeen?: number;
  nbChecked?: number;
  nbSuccess?: number;
  nbFailures?: number;
  updatedAt: number;
};

export type StudentDayModelStatsType = DayModelStatsType & {
  pkId: string;
  studentId: string;
};

export interface LanguageClassType extends CommonRecord {}

export interface RegistrationType extends CommonRecord {
  userId: string;
  classId: string;
}

export interface StudentRegistrationType extends RegistrationType {}
export interface TeacherRegistrationType extends RegistrationType {}

export type PersonType = {
  id: string;
  fullName?: string;
  email: string;
  updatedAt: number;
  config?: string; // json string, can include contact info other than email
};

export interface ClassRegistration {
  id: Identifier;
  className: string;
  classId: string;
  userId: string;
  fullName?: string;
  email: string;
  createdAt: number;
}

export type Participants = {
  teachers: ClassRegistration[];
  students: ClassRegistration[];
};

export type WordModelStatsType = {
  id: string;
  nbSeen?: number;
  nbSeenSinceLastCheck?: number;
  lastSeen?: number;
  nbChecked?: number;
  lastChecked?: number;
  nbTranslated?: number;
  lastTranslated?: number;
  updatedAt: number;
};

export type StudentWordModelStatsType = WordModelStatsType & {
  pkId: string;
  studentId: string;
};

export type EventData = {
  source: string;
  type: string;
  value?: any;
};

export type ExtendedEventData = EventData & {
  progress?: (message: ProgressCallbackMessage) => string;
};

export type PythonCounter = {
  [key: string]: number;
};

export type DictionaryCounter = {
  [key: string]: [string, number];
};

export type SerialisableStringSet = {
  [key: string]: null;
};

export type SerialisableDayCardWords = {
  knownCardWordGraphs: SerialisableStringSet;
  knownCardWordChars?: SerialisableStringSet;
  allCardWordGraphs: SerialisableStringSet;
  knownWordIdsCounter: PythonCounter;
};

export type AnalysisAccuracy = {
  allWords: DictionaryCounter;
  foundWords: PythonCounter;
  notFoundWords: PythonCounter;
  knownFoundWords: PythonCounter;
  knownNotFoundWords: PythonCounter;
};

export type CalculatedContentValueStats = {
  unknownFoundWordsTotalTypes: number;
  unknownNotFoundWordsTotalTypes: number;
  knownFoundWordsTotalTypes: number;
  knownNotFoundWordsTotalTypes: number;
  unknownFoundWordsTotalTokens: number;
  unknownNotFoundWordsTotalTokens: number;
  knownFoundWordsTotalTokens: number;
  knownNotFoundWordsTotalTokens: number;
};

export interface CalculatedContentStats {
  fromLang: InputLanguage;
  knownChars: number;
  chars: number;
  knownWords: number;
  words: number;
  knownCharsTypes: number;
  charsTypes: number;
  knownWordsTypes: number;
  wordsTypes: number;
  meanSentenceLength: number;
}

export interface ContentStats {
  knownChars: PythonCounter;
  chars: PythonCounter;
  knownWords: PythonCounter;
  words: PythonCounter;
  sentenceLengths: PythonCounter;
}

export type GradesType = {
  id: string;
  content: string;
  icon: JSX.Element;
};

export type TokenType = {
  /**
   * Token lemma, currently comes from CoreNLP "lemma" field.
   */
  l: string; // lemma
  /**
   * Token word, currently comes from CoreNLP "originalText" field.
   */
  w?: string; // word
  /**
   * Token word id (bingapilookup.id)
   */
  id?: string;
  /**
   * Token word other ids (bingapilookup.id)
   * These are other words from the lookup that (currently) differ in case from the original form in the source text
   * or import.
   * FIXME: this should also have alternative spellings!!!
   */
  oids?: string[];
  /**
   * CoreNLP pos, if absent then the word can't have a meaning == punctuation
   */
  pos?: AnyTreebankPosType;
  /**
   * "Best Guess" at what the word means in context, in the L1 of the learner
   */
  bg?: string;
  /**
   * Phones, sounds, for Chinese pinyin, could also be IPA, etc.
   */
  p?: string[];
  /**
   * User Synonyms, server-side calculated synonyms that the learner already knows
   */
  us?: string[];
  /**
   * Before, characters that come before the word in the sentence
   * This is particularly for spaces
   */
  b?: string;
  /**
   * After, characters that come before the word in the sentence
   * This is particularly for spaces
   */
  a?: string;
  /**
   * CSS style, TODO: is this horrible???, allow adding style kvs in the data...
   */
  style?: { [key: string]: string };
  /**
   * "Don't Enrich", TODO: is this horrible???, allowing business logic in the data...
   * this is meant so that the data can be marked as not allowing for enrichment - this means
   * that learners *won't* have aids for this token... Which is useful in tests and exercises.
   * Is this a nasty way of doing it? Should this be done somewhere else?
   */
  de?: boolean;
};

export type SentenceType = {
  /**
   * Tokens
   */
  t: TokenType[];
  /**
   * L1 translation of the sentence
   */
  l1?: string;
};

export type ModelType = {
  /**
   * Model Id, a nano-second timestamp of the parse (or enrich) time
   */
  id: bigint | number;
  /**
   * Sentences
   */
  s: SentenceType[]; // sentences
  /**
   * Start WhiteSpace, any whitespace found before the first meaningful character
   */
  sws?: string; // start whitespace
  /**
   * End WhiteSpace, any whitespace found after the last meaningful character
   */
  ews?: string; // end whitespace
};

export type KeyedModels = { [key: string]: ModelType };

export type EnrichedHtmlModels = {
  html: string;
  analysis: string; // this is a string because for imports it is stored as a string
  models: KeyedModels;
};

export type RecentSentencesStoredType = {
  id: string; // wordId
  lzContent: string; // LZ-String content, see https://github.com/pieroxy/lz-string
  updatedAt: number;
};

export type PosSentence = {
  dateViewed: number;
  sentence: SentenceType;
  manual: boolean;
  source?: string; //URL
  modelId?: number; //the nanosecond timestamp from the API
};

export type PosSentences = {
  [key in AnyTreebankPosType]?: PosSentence[];
};

export type RecentSentencesType = {
  id: string; // wordId
  posSentences: PosSentences;
};

export type ImportAnalysis = {
  vocabulary: {
    // {\"1\":[\"H．E．F．史拉轰\",\"K书\",\"X光\",\"z字形\"], "2": ["..."]...
    buckets: { [nb_occurrences: string]: string[] };
    // {\"1\":7055,\"2\":2200,\"4\":738,\"3\":1129,...
    counts: { [nb_occurrences: string]: number };
  };
  sentenceLengths?: number[];
  grammar_rules?: { [key: string]: number };
};

export type FirstSuccess = { firstSuccess: number; nbOccurrences: number };
export type DayStat = { day: number; nbOccurrences: number };

export type HistoData = {
  name: string;
  value: number;
};

export type ImportFirstSuccessStats = {
  successChars: FirstSuccess[];
  successWords: FirstSuccess[];
  nbUniqueWords: number;
  nbTotalWords: number;
  nbUniqueCharacters: number;
  nbTotalCharacters: number;
  meanSentenceLength?: number;
};

export type ListFirstSuccessStats = {
  successChars: FirstSuccess[];
  successWords: FirstSuccess[];
  nbUniqueWords: number;
  nbUniqueCharacters: number;
};

export type GraderConfig = {
  isAdvanced: boolean;
  gradeOrder: GradesType[];
  itemOrdering: WordOrdering;
  itemsPerPage: number;
  wordLists: SelectableListElementType[];
  toLang: SystemLanguage;
};

export type VocabReview = {
  id: string;
  graph: string;
  sound: string[];
  meaning: string;
  clicks: number;
  lookedUp: boolean;
};

export type DailyReviewables = {
  allReviewableDefinitions: Map<string, DefinitionType>;
  potentialCardsMap: Map<string, Set<string>>;
  existingCards: Map<string, CardType>;
  allPotentialCharacters: Map<string, CharacterType>;
  recentSentences: Map<string, RecentSentencesStoredType>;
};

export type ReviewablesInfoType = DailyReviewables & {
  definition: DefinitionType | null;
  currentCard: CardType | null;
  characters: CharacterType[] | null;
  newToday: number;
  completedNewToday: number;
  availableNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
};

export type ReviewInfosType = {
  definition: DefinitionType | null;
  currentCard: CardType | null;
  characters: CharacterType[] | null;
  newToday: number;
  completedNewToday: number;
  availableNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
  curNewWordIndex: number;
  todaysWordIds: Set<string>;
  existingWords: Map<string, DefinitionType>;
  recentSentences: Map<string, RecentSentencesStoredType>;
  existingCards: Map<string, CardType>;
  allNonReviewedWordsMap: Map<string, DefinitionType>;
  potentialWords: DefinitionType[];
  allPotentialCharacters: Map<string, CharacterType>;
};
