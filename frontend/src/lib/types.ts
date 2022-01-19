import { ReduxState, Record, Identifier } from "react-admin";
import { HslColor } from "react-colorful";

import {
  CardDocument,
  CharacterDocument,
  DefinitionDocument,
  WordModelStatsDocument,
} from "../database/Schema";
import { ServiceWorkerProxy } from "./proxies";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

export type KnownLanguage = "en" | "zh-Hans";
export type InputLanguage = "zh-Hans";

export type SIMPLE_POS_TYPES =
  | "ADV"
  | "OTHER"
  | "CONJ"
  | "DET"
  | "NOUN"
  | "VERB"
  | "PREP"
  | "PRON"
  | "ADJ"
  | "MODAL";

export type WordOrdering = "Natural" | "WCPM" | "Personal";

export const ZH_TB_POS_TO_SIMPLE_POS: { [key: string]: SIMPLE_POS_TYPES } = {
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

export type TREEBANK_POS_TYPES = keyof typeof ZH_TB_POS_TO_SIMPLE_POS;

export const SIMPLE_POS_ENGLISH_NAMES: { [key in SIMPLE_POS_TYPES]: string } = {
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

// FIXME: This shouldn't be here...
export const ZH_TB_POS_LABELS: { [key in TREEBANK_POS_TYPES]: string } = {
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

export type GlossPosition = "row" | "column-reverse" | "column" | "row-reverse";

export type ComponentsAppConfig = {
  segmentation: boolean;
  glossing: number;
  fontSize: number;
  glossFontColour: HslColor | null;
  glossFontSize: number;
  glossPosition: GlossPosition;
  mouseover: boolean;
  popupParent: HTMLElement;
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

export const SUBS_DATA_SUFFIX = ".data.json";

export const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60; // default is only a week
export const WEBPUB_CACHE_NAME = "webpub-cache";
export const PRECACHE_PUBLICATIONS = "PRECACHE_PUBLICATIONS";
export const IS_DEV = process.env.NODE_ENV === "development";

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

export interface AppState extends ReduxState {
  theme: ThemeName;
}

// FIXME: can these really be used???
// interface Event {
//   type: string;
//   data: any;
//   source: string;
//   user_stats_mode: number;
// }
// export interface ActionEvent extends Event {}
// export interface VocabEvent extends Event {}
// export interface CardEvent extends Event {}

export type EventQueueType = {
  id: string;
  eventString: string;
};

interface CommonRecord extends Record {
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

export type PosTranslationsType = {
  posTag: string;
  values: string[];
};

export type ProviderTranslationType = {
  provider: string;
  posTranslations: PosTranslationsType[];
};

export type SynonymType = {
  posTag: string;
  values: string[];
};

export type DefinitionType = {
  id: string;
  graph: string;
  updatedAt: number;
  sound: string[];
  synonyms: SynonymType[];
  providerTranslations: ProviderTranslationType[];
  //{"pinyin": "de/dí/dì", "wcpm": "50155.13", "wcdp": "100", "pos": ".u.n.", "pos_freq": ".1682369.161."}
  frequency: { wcpm: string; wcdp: string; pos: string; pos_freq: string };
  hsk: { levels: number[] };
};

export type WordlistType = {
  id: string;
  name: string;
  default: boolean;
  wordIds: string[];
  updatedAt: number;
};

export type CharacterType = {
  id: string;
  structure: any; // FIXME: but not really _that_ important to type this, I don't control it
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
  showL2LengthHint: boolean;
  activeCardTypes: SelectableListElementType[];
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

export type EventData = {
  source: string;
  type: string;
  value: any;
};

export type PythonCounter = {
  [key: string]: number;
};

export type DayCardWords = {
  knownCardWordGraphs: Set<string>;
  allCardWordGraphs: Set<string>;
  knownWordIdsCounter: PythonCounter;
};

export type GradesType = {
  id: string;
  content: string;
  icon: JSX.Element;
};

export type TokenType = {
  /**
   * Token lemma, currently comes from CoreNLP "originalToken field".
   */
  l: string; // lemma
  /**
   * Token word id (bingapilookup.id)
   */
  id?: string;
  /**
   * CoreNLP pos, if absent then the word can't have a meaning == punctuation
   */
  pos?: TREEBANK_POS_TYPES;
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
  [key in TREEBANK_POS_TYPES]?: PosSentence[];
};

export type RecentSentencesType = {
  id: string; // wordId
  posSentences: PosSentences;
};

export type ImportAnalysis = {
  vocabulary: { buckets: { [key: string]: string[] }; counts: { [key: string]: number } };
  grammar_rules: { [key: string]: number };
};

export type FirstSuccess = { firstSuccess: number; nbOccurrences: number };

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
};

export type ListFirstSuccessStats = {
  successChars: FirstSuccess[];
  successWords: FirstSuccess[];
  nbUniqueWords: number;
  nbUniqueCharacters: number;
};

export type GraderConfig = {
  gradeOrder: GradesType[];
  itemOrdering: WordOrdering;
  itemsPerPage: number;
  wordLists: SelectableListElementType[];
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
