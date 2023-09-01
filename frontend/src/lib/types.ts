import { Identifier, RaRecord, ThemeType, UserIdentity } from "react-admin";
import { HslColor } from "react-colorful";

import type Polyglot from "node-polyglot";
import { Locator } from "../r2d2bc";
import type { DataManager, GenericMessage } from "../data/types";

export const SUBS_DATA_SUFFIX = ".data.json";

export const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60; // default is only a week
export const WEBPUB_CACHE_NAME = "webpub-cache";
export const PRECACHE_PUBLICATIONS = "precachePublications";
export const IS_DEV = import.meta.env.DEV;
export const IS_EXT = import.meta.env.PLATFORM === "extension";
export const DOCS_DOMAIN = import.meta.env.VITE_DOCS_DOMAIN || "tc.tck:1313";
export const SITE_DOMAIN = import.meta.env.VITE_SITE_DOMAIN || "tc.tck";
export const GIT_VERSION = import.meta.env.VITE_GIT_VERSION || import.meta.env.GIT_VERSION;
export const DEFAULT_SERVER_URL = `https://${SITE_DOMAIN}`;

export const DOWNLOAD_DOMAIN = import.meta.env.VITE_DOWNLOAD_DOMAIN || "dl.tc.tck";
export const KIWI_LOCAL_URL = `https://${DOWNLOAD_DOMAIN}/kiwi-browser-latest.apk`;
export const KIWI_PLAY_URL = "https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en&gl=GB";

export const REMOVABLE_NOUN_SUFFIXES = [
  "们",
  "儿",
  "者",
  // "族",
  // "色",
];
// export const REMOVABLE_ADJECTIVE_SUFFIXES = []
export const REMOVABLE_ADVERB_SUFFIXES = ["地", "里", "著", "在"]; // are these adverbials?
export const REMOVABLE_VERB_COMPLEMENTS = [
  "上",
  "下",
  "过",
  "到",
  "完",
  "成",
  "给",
  "错",
  "得",
  "够",
  "出",
  "掉",
  "起",
  "好",
  // "去"
];

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

export const BROCROBES_CHROME_WEB_STORE_URL =
  "https://chrome.google.com/webstore/detail/brocrobes/akeangohpdjllngpjiodmebgfhejbbpo?hl=en-GB";
export const BROCROBES_EDGE_WEB_STORE_URL =
  "https://microsoftedge.microsoft.com/addons/detail/brocrobes/nlnfancjmjhldabjcpjgpenknkifbgho";
export const BROCROBES_ZIP_URL = `https://${DOWNLOAD_DOMAIN}/brocrobes-latest.zip`;

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
  "zh-Hans": ["zh-CN", "zh-SG", ".*#Hans$"],
  en: ["en-GB", "en-UK", "en-US", "^en-.*"],
};

export type SystemLanguage = "en" | "zh-Hans";
export type KnownLanguage = SystemLanguage;
export type InputLanguage = SystemLanguage;
export type CornerPosition = "none" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type NetflixDetails = {
  language: string;
  subs: Record<number, [{ url: string }, { url: string }]>;
};
export const DEBOUNCE_SELECTION_MS = 1000;

const SIMPLE_POS_VALUES = ["ADV", "OTHER", "CONJ", "DET", "NOUN", "VERB", "PREP", "PRON", "ADJ", "MODAL"] as const;
const SIMPLE_POS_VALUES_OBJ = SIMPLE_POS_VALUES.reduce(
  (acc, next) => ({ ...acc, [next]: null }),
  {} as Record<string, null>,
);
export type SimplePosType = (typeof SIMPLE_POS_VALUES)[number];

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
export type EnTreebankPosType = (typeof EN_TREEBANK_POS_VALUES)[number];
export type ZhTreebankPosType = (typeof ZH_TREEBANK_POS_VALUES)[number];

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
export type USER_STATS_MODE_KEY_VALUES = (typeof USER_STATS_MODE)[USER_STATS_MODE_KEY];

export const BASE_DICT_PROVIDERS = {
  mst: "Bing",
  fbk: "Bing fallback",
};
export const EN_ZHHANS_DICT_PROVIDERS = BASE_DICT_PROVIDERS;
export const ZHHANS_EN_DICT_PROVIDERS = {
  mst: "Bing",
  ccc: "CC Cedict",
  fbk: "Bing fallback",
};
// unused
// export type ZHHansEnDictProvider = keyof typeof ZHHANS_EN_DICT_PROVIDERS;
// export type EnZHHansDictProvider = keyof typeof EN_ZHHANS_DICT_PROVIDERS;
// export type DictProvider = ZHHansEnDictProvider | EnZHHansDictProvider;

export type DBParameters = {
  url: URL;
  username: string;
};

export const TCDB_FILENAME = "tcdb";

export const GLOSS_NUMBER_NOUNS = false;
export type GlossPosition = "row" | "column-reverse" | "column" | "row-reverse";

export type PopupPosition = {
  overflow: "auto";
  left: string;
  top: string;
  maxHeight?: string;
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

export type ExtensionImportMessage = {
  status: "error" | "ongoing" | "finished";
  message: string;
};

export type Subtitle = {
  url: string;
  lang?: string;
  label?: string;
  content?: string;
};
export type StreamCategory = "movie" | "series" | "unknown";
export type StreamType = "trailer" | "full" | "unknown";
export type SupportedStreamer = "youku" | "netflix";

export type StreamDetails = {
  imdbId?: string;
  streamer: SupportedStreamer;
  canonicalUrl: string;
  streamerId: string;
  category: StreamCategory;
  language: string; // the two-letter language code ('zh', 'fr', 'en') of the StreamDetails titles, etc.
  duration: number;
  subtitles?: Subtitle[];
  streamType?: StreamType;
  seasonId?: string;
  seasonTitle?: string;
  seasonShortName?: string;
  seasonNumber?: number;
  seasonYear?: number;
  episode?: number;
  episodeTitle?: string;
  year?: number; // year of movie or first season
  country?: string;
  showId?: string;
  showTitle?: string;
  originalTitle?: string;
  showGenre?: string;
};

type MatchSet = {
  [key in SupportedStreamer]: {
    siteLang: SystemLanguage;
    ui: RegExp;
    webReqWC: string;
    webReqRE: RegExp;
  };
};

export const STREAMER_DETAILS: MatchSet = {
  youku: {
    siteLang: "zh-Hans",
    ui: /v\.youku\.com\/v_show\/id_([a-zA-Z0-9=]+)\.html/,
    webReqWC: "https://acs.youku.com/h5/mtop.youku.play.ups.appinfo.get/*",
    webReqRE: /https:\/\/acs\.youku\.com\/h5\/mtop\.youku\.play\.ups\.appinfo\.get\/.*/,
  },
  netflix: {
    siteLang: "en",
    ui: /(www\.netflix\.com\/watch\/([a-zA-Z0-9=]+))/,
    webReqWC: "https://*.oca.nflxvideo.net/?o=1&v=*",
    webReqRE: /https:\/\/.*\.oca\.nflxvideo\.net\/\?o=1\&v=.*/,
  },
  // FIXME: the following were autogenerated by copilot!!!
  // tencent: /v\.qq\.com\/x\/page\/([a-zA-Z0-9=]+)\.html/,
  // disney: /www\.disneyplus\.com\/video\/([a-zA-Z0-9=]+)\?/,
};

export const BOOK_READER_TYPE = "bookReader";
export const EXTENSION_READER_TYPE = "extensionReader";
export const SIMPLE_READER_TYPE = "simpleReader";
export const VIDEO_READER_TYPE = "videoReader";

export type ReaderType = "bookReader" | "extensionReader" | "simpleReader" | "videoReader";

export const TEXT_READER_ID = "textReader";
export const WEB_READER_ID = "webReader";
export const RECENTS_READER_ID = "recentsReader";
export const EXTENSION_READER_ID = "extensionReader";

export type FontColourType = HslColor | null | "tones";
export type FontShadowType = "black" | "white" | "none";
export interface ReaderState {
  id: string;
  readerType: ReaderType;
  fontColour: FontColourType;
  fontFamilyGloss: FontFamily | FontFamilyChinese;
  fontFamilyMain: FontFamily | FontFamilyChinese;
  fontTextShadow: FontShadowType;
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
  pageMargins: number;
  isScrolling: boolean;
  currentTocUrl: string | null;
  atStart: boolean;
  atEnd: boolean;
  onScreenModels?: string[];
  location?: Locator | undefined;
  readerType: typeof BOOK_READER_TYPE;
}

export function translationProviderOrder(providers: Record<string, string>) {
  return Object.keys(providers).reduce((acc, next, ind) => ({ ...acc, [next]: ind }), {} as Record<string, number>);
}

export const DEFAULT_READER_CONFIG_STATE: ReaderState = {
  id: "simpleReader",
  readerType: "simpleReader",
  fontFamilyGloss: "Original",
  fontFamilyMain: "Original",
  fontSize: 1,
  fontColour: null,
  fontTextShadow: "none",
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
  translationProviderOrder: translationProviderOrder(BASE_DICT_PROVIDERS),
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
  onScreenModels: [],
  location: undefined,
};

export interface ExtensionReaderState extends ReaderState {
  locale: SystemLanguage;
  showSuggestions: boolean;
  analysisPosition: CornerPosition;
  themeName: ThemeType;
  readerType: typeof EXTENSION_READER_TYPE;
}

export const DEFAULT_EXTENSION_READER_CONFIG_STATE: ExtensionReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: EXTENSION_READER_ID,
  locale: "en",
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
  volumeBoost: number;
  played: number;
  muted: boolean;
  timeDisplayFormat: TimeDisplayFormat;
  playbackRate: number;
  subPlaybackRate: number;
  subBoxWidth: number;
  subDelay: number;
  subRaise: number;
  subPosition: SubPosition;
  subBackgroundBlur: boolean;
  readerType: typeof VIDEO_READER_TYPE;
}

export const DEFAULT_VIDEO_READER_CONFIG_STATE: VideoReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: "",
  fontSize: 1.5,
  fontColour: { h: 0, s: 0, l: 100 },
  glossFontColour: { h: 240, s: 100, l: 70 },
  glossPosition: "column",
  playbackRate: 1.5,
  subPlaybackRate: 0.75,
  subBoxWidth: 1.0,
  subDelay: 0,
  subRaise: 0,
  subPosition: "bottom",
  subBackgroundBlur: false,
  volume: 1,
  volumeBoost: 1,
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
  proxy: DataManager;
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

export const APPLICATION_NAMES = ["repetrobes", "listrobes", "notrobes", "brocrobes"] as const;
export type TCApplication = (typeof APPLICATION_NAMES)[number];

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
  shared: boolean;
  sourceUrl?: string;
  extraData?: string;
}

export interface Content extends CommonRecord {
  processing: number;
  theImport: string;
  contentType: number;
  author: string;
  cover: string;
  lang: string;
  shared: boolean;
  sourceUrl: string;
  extraData: string;
}

export interface UserDictionary extends CommonRecord {
  lzContent: string; // LZ-String content, see https://github.com/pieroxy/lz-string
  processing: number; //???
  langPair: string;
  shared: boolean;
}

export type PracticeDetailsType = {
  wordId: string;
  grade: number;
  cardType?: number;
  badReviewWaitSecs?: number;
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

export interface CardBaseType {
  dueDate: number;
  firstRevisionDate: number;
  lastRevisionDate: number;
  firstSuccessDate: number;
  updatedAt: number;
}

export interface CardCacheType extends Partial<CardBaseType> {
  cardType: number;
  wordId: number;
  suspended: 0 | 1;
  known: 0 | 1;
}

export interface CardType extends SuperMemoType, CardBaseType {
  id: string;
  front?: string;
  back?: string;
  suspended: boolean;
  known: boolean;
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
  ignore?: boolean;
  firstSuccessDate?: number;
};

export interface DefinitionsState {
  [key: string]: DefinitionState;
}

export type RawUserDefinitionType = {
  id: string;
  dictionaryId: string;
  translations: string;
  sounds?: string;
};

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
  posFreq: string;
};

export type RawDefinitionType = {
  id: string;
  graph: string;
  updatedAt: number;
  sound: string;
  synonyms: string;
  providerTranslations: string;
  wcpm: number;
  wcdp: number;
  pos: string;
  posFreq: string;
  hsk: string;
  fallbackOnly: boolean;
};

export type RichDefinitionType = DefinitionState;

export type DefinitionType = {
  id: string;
  graph: string;
  updatedAt: number;
  sound: string[];
  synonyms: SynonymType[];
  providerTranslations: ProviderTranslationType[];
  frequency: FrequencyType;
  hsk: { levels: number[] };
  fallbackOnly: boolean;
};

export type WordlistType = {
  id: string;
  name: string;
  is_default: boolean;
  updatedAt: number;
};

export type ShortWord = { id: string; sounds: string[]; isDict: boolean };
export type ShortChar = { id: string; radical: string };

export type RawCharacterType = {
  id: string;
  updatedAt: number;
  pinyin: string;
  decomposition: string;
  radical: string;
  etymology?: string;
  structure: string;
};

export type HanziWriterStructure = {
  medians: number[][][];
  radStrokes: number[];
  strokes: string[];
};

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

export type ProgressCallbackMessage = {
  source: string;
  isFinished: boolean;
  message: PolyglotMessage;
};

export type WordDetailsTypeOrig = {
  word: DefinitionType | null;
  cards: CardType[];
  characters: (CharacterType | null)[];
  wordModelStats: WordModelStatsType | null;
  recentPosSentences: PosSentences | null;
};

export type WordDetailsType = {
  wordlists: SortableListElementType[];
  word: DefinitionType | null;
  cards: CardCacheType[];
  characters: (CharacterType | null)[];
  wordModelStats: WordModelStatsType | null;
  recentPosSentences: PosSentences | null;
  userDefinitions: [string, UserDefinitionType][] | null;
};

export type WordListNamesType = {
  [key: string]: string;
};

export type UserListPositionType = {
  listId: string;
  position: number;
};

export interface ExtendedActionProps {
  forceEdit?: boolean;
  noCreate?: boolean;
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
  wordLists: SelectableListElementType[];
  todayStarts: number;
  onlySelectedWordListRevisions: boolean;
  showProgress: boolean;
  showRecents: boolean;
  showSynonyms: boolean;
  showNormalFont: boolean;
  showL2LengthHint: boolean;
  filterUnsure: boolean;
  activeCardTypes: SelectableListElementType[];
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

export type PolyglotMessage = {
  phrase: string;
  options?: Polyglot.InterpolationOptions;
};

export type ExtendedEventData = GenericMessage & {
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

export type StringCounter = PythonCounter;

export type KnownWords = {
  knownWordGraphs: SerialisableStringSet;
};

export type CacheRefresh = {
  name: string;
  values?: any;
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
  icon?: JSX.Element;
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
  id?: bigint | number;
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

export type ImportWordType = {
  wordId: number;
  importId: string;
  nbOccurrences: number;
  graph: string;
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
  fromLang: InputLanguage;
};

export type VocabReview = {
  id: string;
  graph: string;
  sound: string[];
  providerTranslations: ProviderTranslationType[];
  clicks: number;
  lookedUp: boolean;
};

export type CurrentCardFullInfo = {
  card: CardType;
  definition: DefinitionType;
  characters?: (CharacterType | null)[];
  recentSentences?: RecentSentencesType;
};

export type CurrentCardInfo = {
  card: CardCacheType;
  definition: DefinitionType;
  characters?: (CharacterType | null)[];
  recentSentences?: RecentSentencesType;
};

export type SrsStatusData = {
  nbNewDone: number;
  nbNewToRepeat: number;
  nbAvailableNew: number;
  nbRevisionsDone: number;
  nbRevisionsToRepeat: number;
  nbAvailableRevisions: number;
};
