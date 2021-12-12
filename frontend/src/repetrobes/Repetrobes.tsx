import { ReactElement, useEffect, useState } from "react";
import { IconContext } from "react-icons";
import dayjs from "dayjs";
import _ from "lodash";

import { CARD_TYPES, GRADE, getWordId, getCardType, getCardId } from "../database/Schema";
import { shuffleArray } from "../lib/review";
import RepetrobesConfigLauncher from "./RepetrobesConfigLauncher";
import VocabRevisor from "./VocabRevisor";
import { USER_STATS_MODE } from "../lib/lib";

import { $enum } from "ts-enum-util";
import {
  CardType,
  CharacterType,
  DefinitionType,
  EMPTY_CARD,
  PosSentences,
  RecentSentencesStoredType,
  RepetrobesActivityConfigType,
  SafeDailyReviewsType,
  SelectableListElementType,
  UserListWordType,
  WordListNamesType,
} from "../lib/types";
import { ServiceWorkerProxy } from "../lib/proxies";
import styled from "styled-components";
import { getSettingsValue, setSettingsValue } from "../lib/appSettings";
import { configIsUsable } from "../lib/funclib";
import { recentSentencesFromLZ } from "../lib/data";

const DATA_SOURCE = "Repetrobes.tsx";

const DEFAULT_FORCE_WCPM = false; // repeated from listrobes, show this be the same?
const DEFAULT_ONLY_SELECTED_WORDLIST_REVISIONS = false;
const DEFAULT_QUESTION_SHOW_SYNONYMS = false;
const DEFAULT_QUESTION_SHOW_PROGRESS = false;
const DEFAULT_QUESTION_SHOW_L2_LENGTH_HINT = false;
const DEFAULT_ANSWER_SHOW_RECENTS = false;
const DEFAULT_DAY_STARTS_HOUR = 0;
const DEFAULT_BAD_REVIEW_WAIT_SECS = 600;
const DEFAULT_MAX_NEW = 20;
const DEFAULT_MAX_REVISIONS = 100;

const RANDOM_NEXT_WINDOW = 10;

function getRandomNext(candidates: CardType[], nextWindowSize: number = RANDOM_NEXT_WINDOW) {
  const shortList = candidates.slice(0, nextWindowSize);
  return shortList[Math.floor(Math.random() * Math.floor(shortList.length))];
}

const LauncherStyle = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5em;
`;

const ProgressStyle = styled.div<{ colour: string }>`
  background-color: ${(props) => props.colour || "inherit"};
  padding: 0.2em;
`;
interface ProgressProps {
  activityConfig: RepetrobesActivityConfigType;
  newToday: number;
  completedNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
}

function progressColour(
  started: number,
  completed: number,
  maxTodo: number,
): "green" | "yellow" | "inherit" {
  if (completed >= maxTodo) return "green";
  if (started >= maxTodo) return "yellow";
  return "inherit";
}

function Progress({
  activityConfig,
  newToday,
  completedNewToday,
  revisionsToday,
  completedRevisionsToday,
  possibleRevisionsToday,
}: ProgressProps) {
  const allRevisionsToday = revisionsToday + possibleRevisionsToday;
  return (
    <div>
      <ProgressStyle colour={progressColour(newToday, completedNewToday, activityConfig.maxNew)}>
        New: ({completedNewToday}) {newToday} / {activityConfig.maxNew}
      </ProgressStyle>
      <ProgressStyle
        colour={progressColour(
          revisionsToday,
          completedRevisionsToday,
          Math.min(allRevisionsToday, activityConfig.maxRevisions),
        )}
      >
        Revisions: ({completedRevisionsToday}) {revisionsToday} /{" "}
        {Math.min(allRevisionsToday, activityConfig.maxRevisions)} ({allRevisionsToday} due)
      </ProgressStyle>
    </div>
  );
}

interface RepetrobesProps {
  proxy: ServiceWorkerProxy;
}

type ReviewInfosType = {
  definition: DefinitionType | null;
  currentCard: CardType | null;
  characters: CharacterType[] | null;
  newToday: number;
  completedNewToday: number;
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

function Repetrobes({ proxy }: RepetrobesProps): ReactElement {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userListWords, setUserListWords] = useState<UserListWordType>({});
  const [daState, setDaState] = useState<ReviewInfosType>({
    newToday: 0,
    completedNewToday: 0,
    revisionsToday: 0,
    completedRevisionsToday: 0,
    possibleRevisionsToday: 0,
    curNewWordIndex: 0,
    characters: null,
    definition: null,
    currentCard: null,
    todaysWordIds: new Set<string>(),
    existingWords: new Map<string, DefinitionType>(),
    recentSentences: new Map<string, RecentSentencesStoredType>(),
    existingCards: new Map<string, CardType>(),
    allNonReviewedWordsMap: new Map<string, DefinitionType>(),
    potentialWords: [],
    allPotentialCharacters: new Map<string, CharacterType>(),
  });
  const EMPTY_ACTIVITY = {
    badReviewWaitSecs: DEFAULT_BAD_REVIEW_WAIT_SECS,
    maxNew: DEFAULT_MAX_NEW,
    maxRevisions: DEFAULT_MAX_REVISIONS,
    forceWcpm: DEFAULT_FORCE_WCPM,
    onlySelectedWordListRevisions: DEFAULT_ONLY_SELECTED_WORDLIST_REVISIONS,
    dayStartsHour: DEFAULT_DAY_STARTS_HOUR,
    wordLists: [],
    showProgress: DEFAULT_QUESTION_SHOW_PROGRESS,
    showSynonyms: DEFAULT_QUESTION_SHOW_SYNONYMS,
    showRecents: DEFAULT_ANSWER_SHOW_RECENTS,
    showL2LengthHint: DEFAULT_QUESTION_SHOW_L2_LENGTH_HINT,
    activeCardTypes: [],
    todayStarts: 0,
  };
  const [stateActivityConfig, setStateActivityConfig] =
    useState<RepetrobesActivityConfigType>(EMPTY_ACTIVITY);

  useEffect(() => {
    (async () => {
      const savedConf = await getSettingsValue("repetrobes", "config");
      let conf: RepetrobesActivityConfigType;
      if (savedConf) {
        conf = JSON.parse(savedConf);
        // wordlists may have been added or removed since, therefore we get the current wordlists
        // and replace with the existing ones where they still exist (because they might have been selected)
        const wordListMap = new Map<string, SelectableListElementType>();
        const wordLists = await proxy.sendMessagePromise<SelectableListElementType[]>({
          source: DATA_SOURCE,
          type: "getDefaultWordLists",
          value: {},
        });
        conf.wordLists.map((wl) => wordListMap.set(wl.label, wl));
        conf.wordLists = wordLists.map((wl) => wordListMap.get(wl.label) || wl);
        conf.activeCardTypes = Array.from($enum(CARD_TYPES).entries())
          .filter(([_l, v]) => !((v as any) instanceof Function))
          .map(([label, value]) => {
            return {
              label: label,
              value: value.toString(),
              selected:
                conf.activeCardTypes.filter((ct) => ct.value === value.toString() && ct.selected)
                  .length > 0,
            };
          });
      } else {
        // eslint-disable-next-line prefer-const
        conf = {
          ...EMPTY_ACTIVITY,
          activeCardTypes: Array.from($enum(CARD_TYPES).entries())
            .filter(([_l, v]) => !((v as any) instanceof Function))
            .map(([label, value]) => {
              return { label: label, value: value.toString(), selected: true };
            }),
          wordLists: await proxy.sendMessagePromise<SelectableListElementType[]>({
            source: DATA_SOURCE,
            type: "getDefaultWordLists",
            value: {},
          }),
        };
      }
      conf.todayStarts = (
        new Date().getHours() < EMPTY_ACTIVITY.dayStartsHour
          ? dayjs().startOf("day").subtract(1, "day")
          : dayjs().startOf("day")
      )
        .add(EMPTY_ACTIVITY.dayStartsHour, "hour")
        .unix();
      setSettingsValue("repetrobes", "config", JSON.stringify(conf));

      const ulws = await proxy.sendMessagePromise<{
        userListWords: UserListWordType;
        wordListNames: WordListNamesType;
      }>({
        source: DATA_SOURCE,
        type: "getUserListWords",
        value: {},
      });
      setUserListWords(ulws.userListWords);

      const activityConfigNew = {
        ...stateActivityConfig,
        ...conf,
      };
      const reviewLists = await proxy.sendMessagePromise<SafeDailyReviewsType>({
        source: DATA_SOURCE,
        type: "getSRSReviews",
        value: activityConfigNew,
      });
      const tempState = {
        ...daState,
        ...reviewLists,
      };
      console.debug("Config set up, about to get the next practice item", tempState);
      nextPractice(tempState, activityConfigNew).then((practiceOut) => {
        const partial = { ...tempState, ...practiceOut };
        setLoading(!(!!partial.currentCard && !!partial.definition));
        setDaState({
          ...daState,
          ...partial,
        });
        setStateActivityConfig(activityConfigNew);
      });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!configIsUsable(stateActivityConfig)) {
        setLoading(true);
        return;
      }
      setLoading(!(!!daState.currentCard && !!daState.definition));
    })();
  }, [daState]);

  useEffect(() => {
    (async () => {
      if (!configIsUsable(stateActivityConfig)) {
        setLoading(true);
        return;
      }
      const reviewLists = await proxy.sendMessagePromise<SafeDailyReviewsType>({
        source: DATA_SOURCE,
        type: "getSRSReviews",
        value: stateActivityConfig,
      });

      const tempState = {
        ...daState,
        ...reviewLists,
      };
      const practiceOut = await nextPractice(tempState, stateActivityConfig);
      const partial = { ...tempState, ...practiceOut };
      setLoading(!(!!daState.currentCard && !!daState.definition));
      setDaState({ ...daState, ...partial });
    })();
  }, [stateActivityConfig]);

  // FIXME: seriously consider typing lookupEvents
  async function submitLookupEvents(lookupEvents: any[], userStatsMode: number) {
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "submitLookupEvents",
      value: { lookupEvents, userStatsMode },
    });
  }

  async function handleCardFrontUpdate(card: CardType) {
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "updateCard",
      value: card,
    });
    setDaState({ ...daState, currentCard: card });
  }

  function handleConfigChange(activityConfig: RepetrobesActivityConfigType) {
    if (!_.isEqual(activityConfig, stateActivityConfig)) {
      setStateActivityConfig(activityConfig);
      setSettingsValue("repetrobes", "config", JSON.stringify(activityConfig));
    }
    setShowAnswer(false);
  }

  function getTodaysCounters(state: ReviewInfosType, activityConfig: RepetrobesActivityConfigType) {
    // FIXME: make functional? store counters in the state? if so, we need to not recount!
    const newToday = new Set<string>();
    const completedNewToday = new Set<string>();
    const revisionsToday = new Set<string>();
    const completedRevisionsToday = new Set<string>();
    const possibleRevisionsToday = new Set<string>();
    const todayStarts = activityConfig.todayStarts;
    let validExisting: Map<string, CardType>;

    const potentialTypes = activityConfig.activeCardTypes
      .filter((x) => x.selected)
      .map((x) => x.value.toString());

    if (activityConfig.onlySelectedWordListRevisions) {
      validExisting = new Map<string, CardType>();
      for (const [k, v] of state.existingCards) {
        if (
          !isListFiltered(v, activityConfig) &&
          !v.known &&
          potentialTypes.includes(getCardType(v))
        ) {
          validExisting.set(k, v);
        }
      }
    } else {
      validExisting = state.existingCards;
    }

    for (const [_k, v] of validExisting) {
      const wordIdStr = getWordId(v);
      if (v.lastRevisionDate > todayStarts && v.firstRevisionDate >= todayStarts) {
        newToday.add(wordIdStr);
        if (v.dueDate > dayjs.unix(todayStarts).add(1, "day").unix()) {
          completedNewToday.add(wordIdStr);
        }
      } else if (v.lastRevisionDate > todayStarts && v.firstRevisionDate < todayStarts) {
        revisionsToday.add(wordIdStr);
        if (v.dueDate > dayjs.unix(todayStarts).add(1, "day").unix()) {
          completedRevisionsToday.add(wordIdStr);
        }
      } else if (v.lastRevisionDate <= todayStarts && v.firstRevisionDate < todayStarts) {
        possibleRevisionsToday.add(wordIdStr);
      }
    }
    const uPossibleRevisionsToday = [...possibleRevisionsToday].filter(
      (x) => !newToday.has(x) && !revisionsToday.has(x),
    );
    console.debug(
      "getTodaysCounters",
      state.existingCards,
      todayStarts,
      newToday,
      completedNewToday,
      revisionsToday,
      completedRevisionsToday,
      possibleRevisionsToday,
      uPossibleRevisionsToday,
    );
    return [
      newToday.size,
      completedNewToday.size,
      revisionsToday.size,
      completedRevisionsToday.size,
      uPossibleRevisionsToday.length,
    ];
  }

  async function newCard(
    existingCards: Map<string, CardType>,
    curNewWordIndex: number,
    potentialWords: DefinitionType[],
    cardTypes: SelectableListElementType[],
    recentSentences: Map<string, RecentSentencesStoredType>,
  ) {
    while (curNewWordIndex < potentialWords.length) {
      // get a random possible new card for the word
      for (const cardType of shuffleArray(Object.values(cardTypes)).filter((x) => x.selected)) {
        const nextReview = potentialWords[curNewWordIndex];
        if (
          !existingCards.has(getCardId(nextReview.id, cardType.value)) &&
          (`${cardType.value}` !== CARD_TYPES.PHRASE.toString() ||
            recentSentences.has(nextReview.id))
        ) {
          console.debug(
            `${getCardId(nextReview.id, cardType.value)} doesn't have card, choosing`,
            recentSentences.get(nextReview.id),
          );
          return [curNewWordIndex, cardType.value];
        }
      }
      curNewWordIndex++;
    }
    return [0, 0];
  }

  async function newRevisionFromState(
    state: ReviewInfosType,
    activityConfig: RepetrobesActivityConfigType,
  ): Promise<[CardType | null, string]> {
    const todaysReviewedCards = new Map(
      [...state.existingCards.values()]
        .filter((x) => {
          return (
            x.lastRevisionDate &&
            x.lastRevisionDate > activityConfig.todayStarts &&
            x.firstRevisionDate &&
            x.firstRevisionDate > 0
          );
        })
        .map((c) => [c.id, c]),
    );
    const todaysReviewedWords = new Map(
      [...todaysReviewedCards.values()].map((x) => [
        getWordId(x),
        state.existingWords.get(getWordId(x)),
      ]),
    );
    const potentialTypes = activityConfig.activeCardTypes
      .filter((x) => x.selected)
      .map((x) => x.value.toString());

    let candidates = [...todaysReviewedCards.values()] // re-revise today's failed reviews
      .filter(
        (x) => x.dueDate && x.dueDate < dayjs().unix() && potentialTypes.includes(getCardType(x)),
      )
      .sort((a, b) => a.dueDate! - b.dueDate!);

    console.debug("Todays overdue candidates", candidates);
    // or if nothing is ready, get a new review that is due
    if (candidates.length < 1) {
      candidates = [...state.existingCards.values()]
        .filter((x) => {
          return (
            x.dueDate &&
            x.dueDate < dayjs().unix() && // or maybe? dayjs.unix(state.activityConfig.todayStarts).add(1, 'day').unix()
            !todaysReviewedWords.has(getWordId(x)) &&
            potentialTypes.includes(getCardType(x)) &&
            !x.known &&
            !isListFiltered(x, activityConfig)
          );
        })
        .sort((a, b) => a.dueDate! - b.dueDate!);
    }
    console.debug("The final candidates list", candidates);
    const candidate = getRandomNext(candidates);
    console.debug("The candidates before returning", candidate);
    return candidate ? [candidate, getCardType(candidate)] : [null, ""];
  }

  function isListFiltered(card: CardType, activityConfig: RepetrobesActivityConfigType): boolean {
    if (!activityConfig.onlySelectedWordListRevisions) return false;
    const wId = getWordId(card);
    if (!userListWords[wId]) return true;
    const lists = new Set<string>(userListWords[wId].map((l) => l.listId));
    for (const dalist of activityConfig.wordLists.filter((wl) => wl.selected)) {
      if (lists.has(dalist.value)) {
        return false;
      }
    }
    return true;
  }

  function getCharacters(
    lallPotentialCharacters: Map<string, CharacterType>,
    definition: DefinitionType,
  ): CharacterType[] {
    return definition.graph
      .split("")
      .map((x) => lallPotentialCharacters.get(x))
      .filter((x) => !!x) as CharacterType[]; // https://github.com/microsoft/TypeScript/issues/16069
  }

  async function unrevisedCard(cardId: string): Promise<CardType> {
    const existing = await proxy.sendMessagePromise<CardType[] | null>({
      source: DATA_SOURCE,
      type: "getByIds",
      value: { collection: "cards", ids: [cardId] },
    });
    return existing && existing.length > 0
      ? existing[0]
      : {
          ...EMPTY_CARD,
          id: cardId,
        };
  }

  async function nextPractice(
    state: ReviewInfosType,
    activityConfig: RepetrobesActivityConfigType,
  ) {
    let currentCard: CardType | null = null;
    let curNewWordIndex = 0;
    let cardType: string;
    let definition: DefinitionType | null = null;

    const [
      newToday,
      completedNewToday,
      revisionsToday,
      completedRevisionsToday,
      possibleRevisionsToday,
    ] = getTodaysCounters(state, activityConfig);
    let getNew = newToday < activityConfig.maxNew;
    if (newToday / revisionsToday > activityConfig.maxNew / activityConfig.maxRevisions) {
      getNew = false;
    }
    if (state.potentialWords.length > 0 && state.curNewWordIndex < state.potentialWords.length) {
      [curNewWordIndex, cardType] = await newCard(
        state.existingCards,
        state.curNewWordIndex,
        state.potentialWords,
        activityConfig.activeCardTypes,
        state.recentSentences,
      );
      currentCard = await unrevisedCard(
        getCardId(state.potentialWords[curNewWordIndex].id, cardType),
      );

      definition = state.potentialWords[curNewWordIndex];
    }
    console.debug("Next practice new card", getNew, currentCard);
    if (!(getNew && currentCard)) {
      const [reviewCard, _reviewCardType] = await newRevisionFromState(state, activityConfig);
      console.debug("Next practice review card", reviewCard, _reviewCardType);
      if (!getNew && reviewCard) {
        currentCard = reviewCard;
        definition = state.existingWords.get(getWordId(reviewCard)) || null;
      }
    }
    const characters = definition ? getCharacters(state.allPotentialCharacters, definition) : null;
    return {
      ...state,
      currentCard,
      definition,
      characters,
      curNewWordIndex: curNewWordIndex || state.curNewWordIndex,
      newToday,
      completedNewToday,
      revisionsToday,
      completedRevisionsToday,
      possibleRevisionsToday,
    };
  }

  function handleShowAnswer() {
    setShowAnswer(true);
  }

  async function handlePractice(wordIdStr: string, grade: number) {
    const { currentCard, definition } = daState;
    const { badReviewWaitSecs } = stateActivityConfig;
    setLoading(true);

    if (!definition || wordIdStr !== getWordId(currentCard!))
      throw new Error("Invalid state, no definition");

    if (grade < GRADE.HARD) {
      // we consider it a lookup, otherwise we wouldn't have needed to look it up
      const lookupEvent = { target_word: definition.graph, target_sentence: "" };
      submitLookupEvents([lookupEvent], USER_STATS_MODE.L1);
    }

    proxy.sendMessage(
      {
        source: DATA_SOURCE,
        type: "practiceCard",
        value: { currentCard, grade, badReviewWaitSecs },
      },
      (practicedCard: CardType) => {
        let newExisting = daState.existingWords;
        if (!newExisting.has(getWordId(practicedCard))) {
          const practicedWord = daState.allNonReviewedWordsMap.get(getWordId(practicedCard));
          if (!practicedWord) {
            throw new Error("Incoherent allNonReviewedWordsMap");
          }
          newExisting = new Map(daState.existingWords).set(getWordId(practicedCard), practicedWord);
        }

        const newState = {
          ...daState,
          existingCards: new Map(daState.existingCards).set(practicedCard.id, practicedCard),
          existingWords: newExisting,

          curNewWordIndex:
            practicedCard.updatedAt === 0 ? daState.curNewWordIndex + 1 : daState.curNewWordIndex,
        };
        nextPractice(newState, stateActivityConfig).then((nextState) => {
          setShowAnswer(false);
          setLoading(false);
          setDaState({ ...nextState });
        });
        return "success";
      },
    );
  }
  function posSentencesFromRecent(
    definitionId: string | undefined,
    theState: ReviewInfosType,
  ): PosSentences | null {
    if (definitionId) {
      const rs = theState.recentSentences.get(definitionId);
      if (rs && rs.lzContent) {
        return recentSentencesFromLZ(definitionId, rs.lzContent)?.posSentences || null;
      }
    }
    return null;
  }

  const ac = stateActivityConfig;
  return (
    <IconContext.Provider value={{ color: "blue", size: "3em" }}>
      <div style={{ padding: "1em" }}>
        <LauncherStyle>
          <RepetrobesConfigLauncher activityConfig={ac} onConfigChange={handleConfigChange} />
          {ac.showProgress && (
            <Progress
              activityConfig={ac}
              newToday={daState.newToday}
              completedNewToday={daState.completedNewToday}
              revisionsToday={daState.revisionsToday}
              completedRevisionsToday={daState.completedRevisionsToday}
              possibleRevisionsToday={daState.possibleRevisionsToday}
            />
          )}
        </LauncherStyle>
        <div>
          <VocabRevisor
            showAnswer={showAnswer}
            activityConfig={stateActivityConfig}
            currentCard={daState.currentCard}
            characters={daState.characters}
            definition={daState.definition}
            recentPosSentences={posSentencesFromRecent(daState.definition?.id, daState)}
            loading={loading}
            onCardFrontUpdate={handleCardFrontUpdate}
            onPractice={handlePractice}
            onShowAnswer={handleShowAnswer}
          />
        </div>
      </div>
    </IconContext.Provider>
  );
}

export default Repetrobes;
