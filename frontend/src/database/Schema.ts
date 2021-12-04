import dayjs from "dayjs";
import { RxCollection, RxJsonSchema, RxDocument, RxDatabase } from "rxdb";

import {
  CardType,
  CharacterType,
  Content,
  ContentConfigType,
  DefinitionType,
  EventQueueType,
  Goal,
  Import,
  PROCESSING,
  PROCESS_TYPE,
  RecentSentencesStoredType,
  SurveyType,
  UserList,
  UserSurvey,
  WordlistType,
  WordModelStatsType,
} from "../lib/types";

const CACHE_NAME = "v1";
const INITIALISATION_CACHE_NAME = `${CACHE_NAME}.initialisation`;
const LIVE_INTERVAL = 60;
const BATCH_SIZE = 10000;

function wordId(card: CardType): string {
  return card.id.split(CARD_ID_SEPARATOR)[0];
}
function cardType(card: CardType): string {
  return card.id.split(CARD_ID_SEPARATOR)[1];
}

const pullDefsQueryBuilder = (doc: { id: any; updatedAt: any }) => {
  if (!doc) {
    // the first pull does not have a start-document
    doc = {
      id: "",
      updatedAt: 0,
    };
  }
  const query = `{
    feedDefinitions(id: "${doc.id}", updatedAt: ${doc.updatedAt}, limit: ${BATCH_SIZE}) {
      frequency {
        pos
        posFreq
        wcdp
        wcpm
      }
      graph
      hsk { levels }
      id
      providerTranslations {
        posTranslations {
          posTag
          values
        }
        provider
      }
      synonyms {
        posTag
        values
      }
      sound
      updatedAt
      deleted
    }
  }`;
  return {
    query,
    variables: {},
  };
};

type EventQueueDocument = RxDocument<EventQueueType>;
type EventQueueCollection = RxCollection<EventQueueType>;
const EVENT_QUEUE_SCHEMA: RxJsonSchema<EventQueueType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    eventString: {
      type: "string",
    },
  },
};

type ContentConfigsDocument = RxDocument<ContentConfigType>;
type ContentConfigsCollection = RxCollection<ContentConfigType>;
const CONTENT_CONFIGS_SCHEMA: RxJsonSchema<ContentConfigType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    configString: {
      type: "string",
    },
  },
};

type DefinitionDocument = RxDocument<DefinitionType>;
type DefinitionCollection = RxCollection<DefinitionType>;
const DEFINITIONS_SCHEMA: RxJsonSchema<DefinitionType> = {
  version: 0,
  required: ["id"],
  type: "object",
  primaryKey: "id",
  properties: {
    id: {
      type: "string",
    },
    graph: {
      type: "string",
    },
    sound: {
      type: "array",
      items: {
        type: "string",
      },
    },
    synonyms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          posTag: {
            type: "string",
          },
          values: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
    },
    providerTranslations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          provider: {
            type: "string",
          },
          posTranslations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                posTag: {
                  type: "string",
                },
                values: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
    frequency: {
      //{"pinyin": "de/dí/dì", "wcpm": "50155.13", "wcdp": "100", "pos": ".u.n.", "pos_freq": ".1682369.161."}
      type: "object",
      properties: {
        wcpm: {
          type: "string", // could be int
        },
        wcdp: {
          type: "string", // could be int
        },
        pos: {
          type: "string",
        },
        pos_freq: {
          type: "string",
        },
      },
      // required: ['wcpm', 'wcdp', 'pos', 'pos_freq']  // FIXME: what will this do to perf?
    },
    hsk: {
      type: "object",
      properties: {
        levels: {
          type: "array",
          items: {
            type: "integer",
          },
        },
      },
    },
    updatedAt: {
      type: "number",
    },
  },
  indexes: ["updatedAt", "graph"],
  // required: ['graph', 'sound', 'definition', 'updatedAt']
};

type CharacterDocument = RxDocument<CharacterType>;
type CharacterCollection = RxCollection<CharacterType>;
const CHARACTERS_SCHEMA: RxJsonSchema<CharacterType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    // id == the graph/character but we MUST have a unique id column with react-admin
    id: {
      type: "string",
    },
    structure: {
      // from https://github.com/chanind/hanzi-writer
      type: "object",
      properties: {
        strokes: {
          type: "array",
          items: {
            type: "string",
          },
        },
        medians: {
          type: "array",
          items: {
            type: "array",
            items: {
              type: "array",
              items: {
                type: "number",
              },
            },
          },
        },
        radStrokes: {
          type: "array",
          items: {
            type: "number",
          },
        },
      },
    },
  },
};

type WordlistDocument = RxDocument<WordlistType>;
type WordlistCollection = RxCollection<WordlistType>;
const WORDLISTS_SCHEMA: RxJsonSchema<WordlistType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    name: {
      type: "string",
    },
    default: {
      type: "boolean",
      default: false,
    },
    wordIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
    updatedAt: {
      type: "number",
    },
  },
  indexes: ["updatedAt"],
};

type WordModelStatsDocument = RxDocument<WordModelStatsType>;
type WordModelStatsCollection = RxCollection<WordModelStatsType>;
const WORD_MODEL_STATS_SCHEMA: RxJsonSchema<WordModelStatsType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    nbSeen: {
      type: "integer",
      default: 0,
    },
    nbSeenSinceLastCheck: {
      type: "integer",
      default: 0,
    },
    lastSeen: {
      type: ["number", "null"],
    },
    nbChecked: {
      type: "integer",
      default: 0,
    },
    lastChecked: {
      type: ["number", "null"],
    },
    nbTranslated: {
      type: "integer",
      default: 0,
    },
    lastTranslated: {
      type: ["number", "null"],
    },
    updatedAt: {
      type: "number",
    },
  },
  indexes: ["updatedAt"],
};

const CARD_ID_SEPARATOR = "-";
const EFACTOR_DEFAULT = 2.5;
const INTERVAL_DEFAULT = 0;
const REPETITION_DEFAULT = 0;
const NO_LIMIT = -1;
enum GRADE {
  UNKNOWN = 2,
  HARD = 3,
  GOOD = 4,
  KNOWN = 5,
  // gradeName : function(grade) {
  //   const name = Object.entries(this).find(i => i[1].toString() === grade.toString())
  //   return name ? name[0].toLowerCase() : undefined;
  // },
}
const DEFAULT_BAD_REVIEW_WAIT_SECS = 600;

enum CARD_TYPES {
  GRAPH = 1,
  SOUND = 2,
  MEANING = 3,
}

type CardDocumentMethodsType = {
  wordId: () => string;
  cardType: () => string;
};

const CardDocumentMethods: CardDocumentMethodsType = {
  wordId: function (): string {
    return wordId(this as any);
  }, // FIXME: why any here?
  cardType: function (): string {
    return cardType(this as any);
  },
};

type CardDocument = RxDocument<CardType, CardDocumentMethodsType>;
type CardCollection = RxCollection<CardType, CardDocumentMethodsType>;
const CARDS_SCHEMA: RxJsonSchema<CardType> = {
  version: 1,
  required: ["id"],
  type: "object",
  primaryKey: "id",
  properties: {
    // "{word_id}-{card_type}" - card_type: 1 = L2 written form, 2 = L2 sound representation, 3 = L1 definition
    id: {
      type: "string",
    },
    dueDate: {
      type: "number",
    },
    interval: {
      type: "integer",
      default: INTERVAL_DEFAULT,
    },
    repetition: {
      type: "integer",
      default: REPETITION_DEFAULT,
    },
    efactor: {
      type: "number",
      default: EFACTOR_DEFAULT,
    },
    front: {
      // manual personalised card front, i.e, not just default generated from the dict
      type: ["string", "null"],
    },
    back: {
      // manual personalised card back, i.e, not just default generated from the dict
      type: ["string", "null"],
    },
    suspended: {
      type: "boolean",
      default: false,
    },
    known: {
      type: "boolean",
      default: false,
    },
    firstRevisionDate: {
      type: "number",
      default: 0,
    },
    lastRevisionDate: {
      type: "number",
      default: 0,
    },
    firstSuccessDate: {
      type: "number",
      default: 0,
    },
    updatedAt: {
      type: "number",
    },
  },
  indexes: ["lastRevisionDate", "dueDate", "firstRevisionDate"],
  // indexes: ['lastRevisionDate', 'dueDate', 'firstRevisionDate', 'suspended'],
};

type RecentSentencesDocument = RxDocument<RecentSentencesStoredType>;
type RecentSentencesCollection = RxCollection<RecentSentencesStoredType>;
const RECENTSENTENCES_SCHEMA: RxJsonSchema<RecentSentencesStoredType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
    },
    lzContent: {
      type: "string",
    },
    updatedAt: {
      type: "number",
    },
  },
  indexes: ["updatedAt"],
};

const COMMON_INFO = {
  id: { type: "string" },
  title: { type: "string" },
  description: { type: ["string", "null"] },
  createdBy: { type: "string" },
  createdAt: { type: "number" },
  updatedBy: { type: ["string", "null"] },
  updatedAt: { type: "number" },
  status: { type: "number" },
  activateDate: { type: "number" },
  deactivateDate: { type: "number" },
};

type SurveyDocument = RxDocument<SurveyType>;
type SurveyCollection = RxCollection<SurveyType>;
const SURVEYS_SCHEMA: RxJsonSchema<SurveyType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    ...COMMON_INFO,
    ...{
      surveyJson: { type: "string" },
      isObligatory: { type: "boolean", default: false },
    },
  },
};

type ImportDocument = RxDocument<Import>;
type ImportCollection = RxCollection<Import>;
const IMPORTS_SCHEMA: RxJsonSchema<Import> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    ...COMMON_INFO,
    ...{
      processing: { type: "number", default: PROCESSING.REQUESTED },
      processType: { type: "number", default: PROCESS_TYPE.VOCABULARY_ONLY },
      importFile: { type: "string" },
      analysis: { type: ["string", "null"] },
      shared: { type: "boolean", default: false },
    },
  },
  indexes: ["title", "processing", "processType"],
};

type ContentDocument = RxDocument<Content>;
type ContentCollection = RxCollection<Content>;
const CONTENTS_SCHEMA: RxJsonSchema<Content> = {
  version: 0,
  required: ["id", "theImport"],
  primaryKey: "id",
  type: "object",
  properties: {
    ...COMMON_INFO,
    ...{
      processing: { type: "number", default: PROCESSING.NONE },
      theImport: { type: "string" },
      contentType: { type: "number" },
      author: { type: ["string", "null"] },
      cover: { type: ["string", "null"] },
      lang: { type: ["string", "null"] },
      shared: { type: "boolean", default: false },
    },
  },
  indexes: ["title", "processing", "contentType"],
};

type UserListDocument = RxDocument<UserList>;
type UserListCollection = RxCollection<UserList>;
const USERLISTS_SCHEMA: RxJsonSchema<UserList> = {
  version: 0,
  required: ["id", "theImport"],
  primaryKey: "id",
  type: "object",
  properties: {
    ...COMMON_INFO,
    ...{
      processing: { type: "number", default: PROCESSING.REQUESTED },
      shared: { type: "boolean", default: false },
      onlyDictionaryWords: { type: "boolean", default: false },
      wordsAreKnown: { type: "boolean", default: false },
      nbToTake: { type: "number", default: NO_LIMIT },
      theImport: { type: "string" },
      orderBy: { type: "number", default: 0 },
      minimumDocFrequency: { type: "number", default: NO_LIMIT },
      minimumAbsFrequency: { type: "number", default: NO_LIMIT },
    },
  },
  indexes: ["title", "processing", "theImport"],
};

type UserSurveyDocument = RxDocument<UserSurvey>;
type UserSurveyCollection = RxCollection<UserSurvey>;
const USERSURVEYS_SCHEMA: RxJsonSchema<UserSurvey> = {
  version: 0,
  required: ["id", "surveyId"],
  primaryKey: "id",
  type: "object",
  properties: {
    ...COMMON_INFO,
    ...{
      surveyId: { type: "string" }, // think about using a proper foreign ref
      data: { type: ["string", "null"] },
    },
  },
  indexes: ["surveyId"],
};

type GoalDocument = RxDocument<Goal>;
type GoalCollection = RxCollection<Goal>;
const GOALS_SCHEMA: RxJsonSchema<Goal> = {
  version: 0,
  required: ["id", "userList"],
  primaryKey: "id",
  type: "object",
  properties: {
    ...COMMON_INFO,
    ...{
      parent: { type: ["string", "null"] },
      userList: { type: "string" },
      priority: { type: "number", default: 5 },
    },
  },
  indexes: ["title", "userList", "priority"],
};

// type DBSyncCollectionType = {
//   schema: RxJsonSchema<any>;
//   feedKeys: string[];
//   deletedFlag: "deleted";
//   subscription: boolean;
//   subscriptionParams?: { token: "String!" };
//   pullQueryBuilder?: (doc: { id: any; updatedAt: any }) => { query: string; variables: {} };
//   methods?: any; // FIXME: any
// };

const DBPullCollections = {
  definitions: {
    schema: DEFINITIONS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    pullQueryBuilder: pullDefsQueryBuilder,
  },
  word_model_stats: {
    schema: WORD_MODEL_STATS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  surveys: {
    schema: SURVEYS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: false,
    // Doesn't require real time updates!
    // subscriptionParams: {
    //   token: "String!",
    // },
  },
};
type DBPullCollectionsType = typeof DBPullCollections;
type DBPullCollectionKeys = keyof DBPullCollectionsType;

const DBTwoWayCollections = {
  goals: {
    schema: GOALS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    //   methods: {
    //     somemethod: function () { return something(this) },
    //   },
    //   migrationStrategies: {
    //     1: function (oldDoc) { return oldDoc; },
    //   }
  },
  imports: {
    schema: IMPORTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  contents: {
    schema: CONTENTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  userlists: {
    schema: USERLISTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  usersurveys: {
    schema: USERSURVEYS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  wordlists: {
    schema: WORDLISTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  recentsentences: {
    schema: RECENTSENTENCES_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
  },
  cards: {
    schema: CARDS_SCHEMA,
    methods: CardDocumentMethods,
    feedKeys: ["id", "updatedAt"],
    deletedFlag: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    migrationStrategies: {
      // 1 means, this transforms data from version 0 to version 1
      1: function (oldDoc: CardType): CardType {
        if (oldDoc.interval) {
          oldDoc.firstSuccessDate = oldDoc.firstRevisionDate;
          oldDoc.updatedAt = dayjs().unix();
        } else {
          oldDoc.firstSuccessDate = 0;
        }
        return oldDoc;
      },
    },
  },
};

type DBTwoWayCollectionsType = typeof DBTwoWayCollections;
type DBTwoWayCollectionKeys = keyof typeof DBTwoWayCollections;

const DBLocalCollections = {
  event_queue: { schema: EVENT_QUEUE_SCHEMA, subscription: false },
  characters: { schema: CHARACTERS_SCHEMA, subscription: false },
  content_config: { schema: CONTENT_CONFIGS_SCHEMA, subscription: false },
};
type DBLocalCollectionKeys = keyof typeof DBLocalCollections;
type DBLocalCollectionsType = typeof DBLocalCollections;

const DBCollections = { ...DBTwoWayCollections, ...DBPullCollections, ...DBLocalCollections };

type DBSyncCollectionKeys = DBTwoWayCollectionKeys | DBPullCollectionKeys;
type DBCollectionsType = typeof DBCollections;
type DBCollectionKeys = keyof DBCollectionsType;

type TranscrobesCollections = {
  goals: GoalCollection;
  imports: ImportCollection;
  contents: ContentCollection;
  userlists: UserListCollection;
  usersurveys: UserSurveyCollection;
  wordlists: WordlistCollection;
  recentsentences: RecentSentencesCollection;
  cards: CardCollection;
  definitions: DefinitionCollection;
  word_model_stats: WordModelStatsCollection;
  surveys: SurveyCollection;
  event_queue: EventQueueCollection;
  characters: CharacterCollection;
  content_config: ContentConfigsCollection;
};

type TranscrobesCollectionsKeys = keyof TranscrobesCollections;

type TranscrobesDatabase = RxDatabase<TranscrobesCollections>;
type TranscrobesDocumentTypes =
  | EventQueueDocument
  | ContentConfigsDocument
  | DefinitionDocument
  | CharacterDocument
  | WordlistDocument
  | WordModelStatsDocument
  | CardDocument
  | SurveyDocument
  | ImportDocument
  | ContentDocument
  | UserListDocument
  | UserSurveyDocument
  | GoalDocument
  | RecentSentencesDocument;

export {
  // RxDB schemata
  // GOALS_SCHEMA,
  // USERLISTS_SCHEMA,
  // WORDLISTS_SCHEMA,
  // IMPORTS_SCHEMA,
  // CARDS_SCHEMA,
  // CONTENT_CONFIGS_SCHEMA,
  // DEFINITIONS_SCHEMA,
  // WORD_MODEL_STATS_SCHEMA,
  // CHARACTERS_SCHEMA,
  // EVENT_QUEUE_SCHEMA,
  // Schema collections
  DBLocalCollections,
  DBCollections,
  DBTwoWayCollections,
  DBPullCollections,
  // DBTwoWayCollectionKeys

  CARD_ID_SEPARATOR,
  GRADE,
  CARD_TYPES,
  EFACTOR_DEFAULT,
  DEFAULT_BAD_REVIEW_WAIT_SECS,
  CACHE_NAME,
  INITIALISATION_CACHE_NAME,
  LIVE_INTERVAL,
  BATCH_SIZE,
  cardType,
  wordId,
};
export type {
  DBCollectionKeys,
  DBCollectionsType,
  DBTwoWayCollectionKeys,
  DBTwoWayCollectionsType,
  DBPullCollectionKeys,
  DBPullCollectionsType,
  DBLocalCollectionKeys,
  DBLocalCollectionsType,
  // EventQueueCollection,
  EventQueueDocument,
  // ContentConfigsCollection,
  ContentConfigsDocument,
  // DefinitionCollection,
  DefinitionDocument,
  // CharacterCollection,
  CharacterDocument,
  // WordlistCollection,
  WordlistDocument,
  // WordModelStatsCollection,
  WordModelStatsDocument,
  // CardCollection,
  CardDocument,
  // SurveyCollection,
  SurveyDocument,
  // ImportCollection,
  ImportDocument,
  // ContentCollection,
  ContentDocument,
  // UserListCollection,
  UserListDocument,
  // UserSurveyCollection,
  UserSurveyDocument,
  // GoalCollection,
  GoalDocument,
  TranscrobesCollections,
  TranscrobesCollectionsKeys,
  DBSyncCollectionKeys,
  TranscrobesDatabase,
  TranscrobesDocumentTypes,
};
