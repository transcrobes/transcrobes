import { RxCollection, RxDatabase, RxDocument, RxJsonSchema } from "rxdb";
import {
  CardType,
  Content,
  ContentConfigType,
  QuestionAnswer,
  EventQueueType,
  Goal,
  Import,
  KnownWords,
  LanguageClassType,
  PROCESSING,
  PROCESS_TYPE,
  RecentSentencesStoredType,
  RequestQueueType,
  SessionType,
  StudentRegistrationType,
  SurveyType,
  TeacherRegistrationType,
  UserActivityType,
  UserDictionary,
  UserList,
  UserSurvey,
} from "../../lib/types";

const CACHE_NAME = "v1";
const INITIALISATION_CACHE_NAME = `${CACHE_NAME}.initialisation`;
const LIVE_INTERVAL = 300;
const LIVE_INTERVAL_WITH_SUBSCRIPTION = 600;
// FIXME: these are large because they should work at this size and it isn't certain batches work in
// all cases
const BATCH_SIZE_PULL = 1000000;
const BATCH_SIZE_PUSH = 1000000;

const TIMESTAMP = { type: "number", minimum: 1000000000, maximum: 9000000000, multipleOf: "0.0000001" };
const RXPROCESSING = { type: "number", default: PROCESSING.REQUESTED, minimum: 0, maximum: 5, multipleOf: 1 };

const COMMON_INFO = {
  id: { type: "string", maxLength: 36 },
  title: { type: "string", maxLength: 255 },
  description: { type: ["string", "null"] },
  createdBy: { type: "string" },
  createdAt: TIMESTAMP,
  updatedBy: { type: ["string", "null"] },
  updatedAt: TIMESTAMP,
  status: { type: "number" },
  activateDate: { type: "number" },
  deactivateDate: { type: "number" },
};

export type Globals = {
  tcb: Promise<TranscrobesDatabase> | null;
  needsReload: boolean;
  dayCardWords: KnownWords | null;
};

export const reloadRequired = new Set<string>();

function getWordId(card: CardType | string): string {
  if (typeof card === "string") {
    return card.split(CARD_ID_SEPARATOR)[0];
  } else {
    return card.id.split(CARD_ID_SEPARATOR)[0];
  }
}

function getCardTypeAsInt(card: string | CardType): number {
  return parseInt(getCardType(card));
}

function getCardType(card: string | CardType): string {
  return (typeof card === "string" ? card : card.id).split(CARD_ID_SEPARATOR)[1];
}

function getCardId(wordId: string | number, cardType: string | number): string {
  return `${wordId}${CARD_ID_SEPARATOR}${cardType}`;
}

type QuestionAnswerDocument = RxDocument<QuestionAnswer>;
type QuestionAnswerCollection = RxCollection<QuestionAnswer>;
const QUESTION_ANSWER_SCHEMA: RxJsonSchema<QuestionAnswer> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 36 },
    questionId: { type: "string", maxLength: 36 },
    studentAnswer: { type: "string" },
    feedback: { type: ["string", "null"] },
    isCorrect: { type: "boolean", default: false },
    // @ts-ignore
    createdAt: TIMESTAMP,
    // @ts-ignore
    updatedAt: TIMESTAMP,
  },
  indexes: ["questionId", "updatedAt"],
};

type UserDictionaryDocument = RxDocument<UserDictionary>;
type UserDictionaryCollection = RxCollection<UserDictionary>;
const USER_DICTIONARIES_SCHEMA: RxJsonSchema<UserDictionary> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      processing: { type: "number", default: PROCESSING.REQUESTED },
      lzContent: { type: "string" },
      fromLang: { type: "string" },
      toLang: { type: "string" },
      shared: { type: "boolean", default: false },
    },
  },
  indexes: ["title", "updatedAt"],
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
      maxLength: 36,
    },
    eventString: {
      type: "string",
    },
  },
};

type ActivityQueueDocument = RxDocument<UserActivityType>;
type ActivityQueueCollection = RxCollection<UserActivityType>;
const ACTIVITY_QUEUE_SCHEMA: RxJsonSchema<UserActivityType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 36 },
    asessionId: { type: "string" },
    activityType: { type: "string" },
    activitySource: { type: "string" },
    url: { type: "string" },
    timestamp: { type: "integer" },
  },
};

type RequestQueueDocument = RxDocument<RequestQueueType>;
type RequestQueueCollection = RxCollection<RequestQueueType>;
const REQUEST_QUEUE_SCHEMA: RxJsonSchema<RequestQueueType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 36 },
    type: { type: "string" },
    endpoint: { type: "string" },
    requestString: { type: "string" },
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
    id: { type: "string", maxLength: 36 },
    configString: { type: "string" },
  },
};

type SessionDocument = RxDocument<SessionType>;
type SessionCollection = RxCollection<SessionType>;
const SESSION_SCHEMA: RxJsonSchema<SessionType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 36 },
    timestamp: { type: "integer" },
  },
};

type LanguageClassDocument = RxDocument<LanguageClassType>;
type LanguageClassCollection = RxCollection<LanguageClassType>;
const LANGUAGECLASSES_SCHEMA: RxJsonSchema<LanguageClassType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: COMMON_INFO,
  indexes: ["updatedAt", "title"],
};

type TeacherRegistrationDocument = RxDocument<TeacherRegistrationType>;
type TeacherRegistrationCollection = RxCollection<TeacherRegistrationType>;
const TEACHERREGISTRATIONS_SCHEMA: RxJsonSchema<TeacherRegistrationType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      classId: { type: "string", maxLength: 255 },
      userId: { type: "string", maxLength: 36 },
    },
  },
  indexes: ["updatedAt"],
};

type StudentRegistrationDocument = RxDocument<StudentRegistrationType>;
type StudentRegistrationCollection = RxCollection<StudentRegistrationType>;
const STUDENTREGISTRATIONS_SCHEMA: RxJsonSchema<StudentRegistrationType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      classId: { type: "string", maxLength: 255 },
      userId: { type: "string", maxLength: 36 },
    },
  },
  indexes: ["updatedAt"],
};

// type PersonDocument = RxDocument<PersonType>;
// type PersonCollection = RxCollection<PersonType>;
// const PERSONS_SCHEMA: RxJsonSchema<PersonType> = {
//   version: 0,
//   required: ["id"],
//   primaryKey: "id",
//   type: "object",
//   properties: {
//     id: { type: "string", maxLength: 36 },
//     fullName: { type: "string", maxLength: 255 },
//     email: { type: "string", maxLength: 255 },
//     config: { type: "string" },
//     // @ts-ignore
//     updatedAt: TIMESTAMP,
//   },
//   indexes: ["updatedAt"],
// };

const CARD_ID_SEPARATOR = "-";
const EFACTOR_DEFAULT = 2.5;
const INTERVAL_DEFAULT = 0;
const REPETITION_DEFAULT = 0;
const NO_LIMIT = -1;
const KNOWLEDGE_UNSET = 0;
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
  PHRASE = 4,
}

type CardDocumentMethodsType = {
  wordId: () => string;
  cardType: () => string;
};

const CardDocumentMethods: CardDocumentMethodsType = {
  wordId: function (): string {
    return getWordId(this as unknown as CardType);
  },
  cardType: function (): string {
    return getCardType(this as unknown as CardType);
  },
};

type CardDocument = RxDocument<CardType, CardDocumentMethodsType>;
type CardCollection = RxCollection<CardType, CardDocumentMethodsType>;
const CARDS_SCHEMA: RxJsonSchema<CardType> = {
  version: 0,
  required: ["id"],
  type: "object",
  primaryKey: "id",
  properties: {
    // "{word_id}-{card_type}" - card_type: 1 = L2 written form, 2 = L2 sound representation, 3 = L1 definition
    id: { type: "string", maxLength: 36 },
    dueDate: { type: "number" },
    interval: { type: "integer", default: INTERVAL_DEFAULT },
    repetition: { type: "integer", default: REPETITION_DEFAULT },
    efactor: { type: "number", default: EFACTOR_DEFAULT },
    // manual personalised card front, i.e, not just default generated from the dict
    front: { type: ["string", "null"] },
    // manual personalised card back, i.e, not just default generated from the dict
    back: { type: ["string", "null"] },
    suspended: { type: "boolean", default: false },
    known: { type: "boolean", default: false },
    firstRevisionDate: { type: "number", default: 0 },
    lastRevisionDate: { type: "number", default: 0 },
    firstSuccessDate: { type: "number", default: 0 },
    updatedAt: { type: "number" },
  },
};

type RecentSentencesDocument = RxDocument<RecentSentencesStoredType>;
type RecentSentencesCollection = RxCollection<RecentSentencesStoredType>;
const RECENTSENTENCES_SCHEMA: RxJsonSchema<RecentSentencesStoredType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 36 },
    lzContent: { type: "string" },
    // @ts-ignore
    updatedAt: TIMESTAMP,
  },
  indexes: ["updatedAt"],
};

type SurveyDocument = RxDocument<SurveyType>;
type SurveyCollection = RxCollection<SurveyType>;
const SURVEYS_SCHEMA: RxJsonSchema<SurveyType> = {
  version: 0,
  required: ["id"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
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
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      processing: RXPROCESSING,
      processType: { type: "number", default: PROCESS_TYPE.VOCABULARY_ONLY, minimum: 1, maximum: 3, multipleOf: 1 },
      importFile: { type: "string" },
      // analysis: { type: ["string", "null"] },
      shared: { type: "boolean", default: false },
      sourceUrl: { type: ["string", "null"] },
      extraData: { type: ["string", "null"] },
    },
  },
  indexes: ["title", "processing", "processType", "createdAt"],
};

type ContentDocument = RxDocument<Content>;
type ContentCollection = RxCollection<Content>;
const CONTENTS_SCHEMA: RxJsonSchema<Content> = {
  version: 0,
  required: ["id", "theImport"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      processing: { ...RXPROCESSING, default: PROCESSING.NONE },
      theImport: { type: "string" },
      contentType: { type: "number", minimum: 1, maximum: 5, multipleOf: 1 }, // currently max 2 but leaving some fat
      author: { type: ["string", "null"] },
      cover: { type: ["string", "null"] },
      lang: { type: ["string", "null"] },
      shared: { type: "boolean", default: false },
      sourceUrl: { type: ["string", "null"] },
      extraData: { type: ["string", "null"] },
    },
  },
  indexes: ["title", "processing", "contentType", "createdAt"],
};

type UserListDocument = RxDocument<UserList>;
type UserListCollection = RxCollection<UserList>;
const USERLISTS_SCHEMA: RxJsonSchema<UserList> = {
  version: 0,
  required: ["id", "theImport"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      processing: RXPROCESSING,
      shared: { type: "boolean", default: false },
      onlyDictionaryWords: { type: "boolean", default: false },
      wordsAreKnown: { type: "boolean", default: false },
      wordKnowledge: { type: "number", default: KNOWLEDGE_UNSET },
      nbToTake: { type: "number", default: NO_LIMIT },
      theImport: { type: "string", maxLength: 36 },
      orderBy: { type: "number", default: 0 },
      minimumDocFrequency: { type: "number", default: NO_LIMIT },
      minimumAbsFrequency: { type: "number", default: NO_LIMIT },
    },
  },
  indexes: ["title", "processing", "theImport", "createdAt"],
};

type UserSurveyDocument = RxDocument<UserSurvey>;
type UserSurveyCollection = RxCollection<UserSurvey>;
const USERSURVEYS_SCHEMA: RxJsonSchema<UserSurvey> = {
  version: 0,
  required: ["id", "surveyId"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      surveyId: { type: "string", maxLength: 36 }, // think about using a proper foreign ref
      data: { type: ["string", "null"] },
    },
  },
  indexes: ["surveyId", "createdAt"],
};

type GoalDocument = RxDocument<Goal>;
type GoalCollection = RxCollection<Goal>;
const GOALS_SCHEMA: RxJsonSchema<Goal> = {
  version: 0,
  required: ["id", "userList"],
  primaryKey: "id",
  type: "object",
  // @ts-ignore
  properties: {
    ...COMMON_INFO,
    ...{
      parent: { type: ["string", "null"] },
      userList: { type: "string", maxLength: 36 }, // think about using a proper foreign ref
      priority: { type: "number", default: 5, minimum: 1, maximum: 10, multipleOf: 1 },
    },
  },
  indexes: ["title", "userList", "priority", "createdAt"],
};

const DBPullCollections = {
  surveys: {
    schema: SURVEYS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: false,
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
};
type DBPullCollectionsType = typeof DBPullCollections;
type DBPullCollectionKeys = keyof DBPullCollectionsType;

const DBTwoWayCollections = {
  goals: {
    schema: GOALS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  imports: {
    schema: IMPORTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  contents: {
    schema: CONTENTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  questionanswers: {
    schema: QUESTION_ANSWER_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  userlists: {
    schema: USERLISTS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  usersurveys: {
    schema: USERSURVEYS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  recentsentences: {
    schema: RECENTSENTENCES_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  cards: {
    schema: CARDS_SCHEMA,
    methods: CardDocumentMethods,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  userdictionaries: {
    schema: USER_DICTIONARIES_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  languageclasses: {
    schema: LANGUAGECLASSES_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  teacherregistrations: {
    schema: TEACHERREGISTRATIONS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
  studentregistrations: {
    schema: STUDENTREGISTRATIONS_SCHEMA,
    feedKeys: ["id", "updatedAt"],
    deletedField: "deleted",
    subscription: true,
    subscriptionParams: {
      token: "String!",
    },
    checkpointFields: ["id", "updatedAt"],
    headerFields: ["Authorization"],
  },
};

type DBTwoWayCollectionsType = typeof DBTwoWayCollections;
type DBTwoWayCollectionKeys = keyof typeof DBTwoWayCollections;

const DBTeacherTwoWayCollections = {};

type DBTeacherTwoWayCollectionsType = typeof DBTeacherTwoWayCollections;
type DBTeacherTwoWayCollectionKeys = keyof typeof DBTeacherTwoWayCollections;

const DBLocalCollections = {
  event_queue: { schema: EVENT_QUEUE_SCHEMA, subscription: false },
  requestqueue: { schema: REQUEST_QUEUE_SCHEMA, subscription: false },
  content_config: { schema: CONTENT_CONFIGS_SCHEMA, subscription: false },
  activityqueue: { schema: ACTIVITY_QUEUE_SCHEMA, subscription: false },
  sessions: { schema: SESSION_SCHEMA, subscription: false },
};
type DBLocalCollectionKeys = keyof typeof DBLocalCollections;
type DBLocalCollectionsType = typeof DBLocalCollections;

const DBCollections = {
  ...DBTwoWayCollections,
  ...DBPullCollections,
  ...DBLocalCollections,
  ...DBTeacherTwoWayCollections,
};

const DBSyncCollection = {
  ...DBTwoWayCollections,
  ...DBPullCollections,
  ...DBTeacherTwoWayCollections,
};

type DBSyncCollectionKeys = DBTwoWayCollectionKeys | DBPullCollectionKeys | DBTeacherTwoWayCollectionKeys;
type DBCollectionsType = typeof DBCollections;
type DBCollectionKeys = keyof DBCollectionsType;

type TranscrobesCollections = {
  goals: GoalCollection;
  imports: ImportCollection;
  contents: ContentCollection;
  questionanswers: QuestionAnswerCollection;
  userlists: UserListCollection;
  usersurveys: UserSurveyCollection;
  recentsentences: RecentSentencesCollection;
  cards: CardCollection;
  teacherregistrations: TeacherRegistrationCollection;
  studentregistrations: StudentRegistrationCollection;
  event_queue: EventQueueCollection;
  requestqueue: RequestQueueCollection;
  activityqueue: ActivityQueueCollection;
  content_config: ContentConfigsCollection;
  userdictionaries: UserDictionaryCollection;
  languageclasses: LanguageClassCollection;
  sessions: SessionCollection;
  surveys: SurveyCollection;
};
type TranscrobesCollectionsKeys = keyof TranscrobesCollections;
type TranscrobesDatabase = RxDatabase<TranscrobesCollections>;

type TranscrobesDocumentTypes =
  | QuestionAnswerDocument
  | EventQueueDocument
  | RequestQueueDocument
  | ActivityQueueDocument
  | ContentConfigsDocument
  | SurveyDocument
  | TeacherRegistrationDocument
  | StudentRegistrationDocument
  | CardDocument
  | ImportDocument
  | ContentDocument
  | UserListDocument
  | UserSurveyDocument
  | GoalDocument
  | RecentSentencesDocument
  | UserDictionaryDocument
  | LanguageClassDocument;

export {
  BATCH_SIZE_PULL,
  BATCH_SIZE_PUSH,
  CACHE_NAME,
  DBCollections,
  DBLocalCollections,
  DBPullCollections,
  DBSyncCollection,
  DBTeacherTwoWayCollections,
  DBTwoWayCollections,
  DEFAULT_BAD_REVIEW_WAIT_SECS,
  EFACTOR_DEFAULT,
  INITIALISATION_CACHE_NAME,
  KNOWLEDGE_UNSET,
  LIVE_INTERVAL,
  LIVE_INTERVAL_WITH_SUBSCRIPTION,
  CARD_TYPES,
  GRADE,
  getCardId,
  getCardType,
  getCardTypeAsInt,
  getWordId,
};

export type {
  ActivityQueueDocument,
  CardDocument,
  ContentConfigsDocument,
  ContentDocument,
  DBCollectionKeys,
  DBCollectionsType,
  DBLocalCollectionKeys,
  DBLocalCollectionsType,
  DBPullCollectionKeys,
  DBPullCollectionsType,
  DBSyncCollectionKeys,
  DBTeacherTwoWayCollectionKeys,
  DBTeacherTwoWayCollectionsType,
  DBTwoWayCollectionKeys,
  DBTwoWayCollectionsType,
  EventQueueDocument,
  GoalDocument,
  ImportDocument,
  LanguageClassDocument,
  RecentSentencesDocument,
  SurveyDocument,
  TranscrobesCollections,
  TranscrobesCollectionsKeys,
  TranscrobesDatabase,
  TranscrobesDocumentTypes,
  UserListDocument,
  UserSurveyDocument,
};
