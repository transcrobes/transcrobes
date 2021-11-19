import { ReactElement, useEffect, useState } from "react";
import { IconContext } from "react-icons";
import dayjs from "dayjs";
import _ from "lodash";

import { CARD_ID_SEPARATOR, CARD_TYPES, GRADE, wordId, cardType } from "../database/Schema";
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
  RepetrobesActivityConfigType,
  SafeDailyReviewsType,
  SelectableListElementType,
} from "../lib/types";
import { ServiceWorkerProxy } from "../lib/proxies";
import styled from "styled-components";
import { getSettingsValue, setSettingsValue } from "../lib/appSettings";

const DATA_SOURCE = "Repetrobes.tsx";

const DEFAULT_FORCE_WCPM = false; // repeated from listrobes, show this be the same?
const DEFAULT_QUESTION_SHOW_SYNONYMS = false;
const DEFAULT_QUESTION_SHOW_PROGRESS = false;
const DEFAULT_QUESTION_SHOW_L2_LENGTH_HINT = false;
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
  revisionsToday: number;
  possibleRevisionsToday: number;
}

function Progress({
  activityConfig,
  newToday,
  revisionsToday,
  possibleRevisionsToday,
}: ProgressProps) {
  const allRevisionsToday = revisionsToday + possibleRevisionsToday;
  return (
    <div>
      <ProgressStyle colour={newToday >= activityConfig.maxNew ? "green" : "inherit"}>
        New: {newToday} / {activityConfig.maxNew}
      </ProgressStyle>
      <ProgressStyle
        colour={
          revisionsToday >= Math.min(allRevisionsToday, activityConfig.maxRevisions)
            ? "green"
            : "inherit"
        }
      >
        Revisions: {revisionsToday} / {Math.min(allRevisionsToday, activityConfig.maxRevisions)} (
        {allRevisionsToday} due)
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
  revisionsToday: number;
  possibleRevisionsToday: number;
  curNewWordIndex: number;
  newToday: number;
  todaysWordIds: Set<string>;
  existingWords: Map<string, DefinitionType>;
  existingCards: Map<string, CardType>;
  allNonReviewedWordsMap: Map<string, DefinitionType>;
  potentialWords: DefinitionType[];
  allPotentialCharacters: Map<string, CharacterType>;
};

function Repetrobes({ proxy }: RepetrobesProps): ReactElement {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [daState, setDaState] = useState<ReviewInfosType>({
    newToday: 0,
    revisionsToday: 0,
    possibleRevisionsToday: 0,
    curNewWordIndex: 0,
    characters: null,
    definition: null,
    currentCard: null,
    todaysWordIds: new Set<string>(),
    existingWords: new Map<string, DefinitionType>(),
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
    dayStartsHour: DEFAULT_DAY_STARTS_HOUR,
    wordLists: [],
    showProgress: false,
    showSynonyms: false,
    showL2LengthHint: false,
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
      } else {
        // eslint-disable-next-line prefer-const
        conf = {
          ...EMPTY_ACTIVITY,
          activeCardTypes: Array.from($enum(CARD_TYPES).entries())
            .filter(([_l, v]) => !((v as any) instanceof Function))
            .map(([label, value]) => {
              return { label: label, value: value.toString(), selected: true };
            }),
          todayStarts: (new Date().getHours() < EMPTY_ACTIVITY.dayStartsHour
            ? dayjs().startOf("day").subtract(1, "day")
            : dayjs().startOf("day")
          )
            .add(EMPTY_ACTIVITY.dayStartsHour, "hour")
            .unix(),
          wordLists: await proxy.sendMessagePromise<SelectableListElementType[]>({
            source: DATA_SOURCE,
            type: "getDefaultWordLists",
            value: {},
          }),
        };
      }
      setSettingsValue("repetrobes", "config", JSON.stringify(conf));

      const activityConfigNew = {
        ...stateActivityConfig,
        ...conf,
      };
      if (conf.wordLists.length === 0 || conf.activeCardTypes.length === 0) {
        setLoading(true);
        return;
      }

      const reviewLists = await proxy.sendMessagePromise<SafeDailyReviewsType>({
        source: DATA_SOURCE,
        type: "getSRSReviews",
        value: activityConfigNew,
      });
      const tempState = {
        ...daState,
        ...reviewLists,
      };

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
      if (
        stateActivityConfig.wordLists.length === 0 ||
        stateActivityConfig.activeCardTypes.length === 0
      ) {
        setLoading(true);
        return;
      }
      setLoading(!(!!daState.currentCard && !!daState.definition));
    })();
  }, [daState]);

  useEffect(() => {
    (async () => {
      if (
        stateActivityConfig.wordLists.length === 0 ||
        stateActivityConfig.activeCardTypes.length === 0
      ) {
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

  function handleConfigChange(activityConfig: RepetrobesActivityConfigType) {
    if (!_.isEqual(activityConfig, stateActivityConfig)) {
      setStateActivityConfig(activityConfig);
      setSettingsValue("repetrobes", "config", JSON.stringify(activityConfig));
    } else {
      setShowAnswer(false);
    }
  }

  function getTodaysCounters(state: ReviewInfosType, activityConfig: RepetrobesActivityConfigType) {
    // FIXME: make functional? store counters in the state? if so, we need to not recount!
    const newToday = new Set<string>();
    const revisionsToday = new Set<string>();
    const possibleRevisionsToday = new Set<string>();
    const todayStarts = activityConfig.todayStarts;
    for (const [_k, v] of state.existingCards) {
      const wordIdStr = wordId(v);
      if (v.lastRevisionDate > todayStarts && v.firstRevisionDate >= todayStarts) {
        newToday.add(wordIdStr);
      } else if (v.lastRevisionDate > todayStarts && v.firstRevisionDate < todayStarts) {
        revisionsToday.add(wordIdStr);
      } else if (v.lastRevisionDate <= todayStarts && v.firstRevisionDate < todayStarts) {
        possibleRevisionsToday.add(wordIdStr);
      }
    }
    const uPossibleRevisionsToday = [...possibleRevisionsToday].filter(
      (x) => !newToday.has(x) && !revisionsToday.has(x),
    );
    console.log(
      "getTodaysCounters",
      state.existingCards,
      todayStarts,
      newToday,
      revisionsToday,
      possibleRevisionsToday,
      uPossibleRevisionsToday,
    );
    return [newToday.size, revisionsToday.size, uPossibleRevisionsToday.length];
  }

  async function newCard(
    existingCards: Map<string, CardType>,
    curNewWordIndex: number,
    potentialWords: DefinitionType[],
    cardTypes: SelectableListElementType[],
  ) {
    while (curNewWordIndex < potentialWords.length) {
      // get a random possible new card for the word
      for (const cardType of shuffleArray(Object.values(cardTypes)).filter((x) => x.selected)) {
        const nextReview = potentialWords[curNewWordIndex];
        if (!existingCards.has(nextReview.id + CARD_ID_SEPARATOR + cardType.value)) {
          console.debug(
            `${nextReview.id + CARD_ID_SEPARATOR + cardType.value} doesn't have card, choosing`,
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
      [...todaysReviewedCards.values()].map((x) => [wordId(x), state.existingWords.get(wordId(x))]),
    );
    const potentialTypes = activityConfig.activeCardTypes
      .filter((x) => x.selected)
      .map((x) => x.value.toString());

    let candidates = [...todaysReviewedCards.values()] // re-revise today's failed reviews
      .filter((x) => x.dueDate && x.dueDate < dayjs().unix())
      .sort((a, b) => a.dueDate! - b.dueDate!);

    // or if nothing is ready, get a new review that is due
    if (candidates.length < 1) {
      candidates = [...state.existingCards.values()]
        .filter((x) => {
          return (
            x.dueDate &&
            x.dueDate < dayjs().unix() && // or maybe? dayjs.unix(state.activityConfig.todayStarts).add(1, 'day').unix()
            !todaysReviewedWords.has(wordId(x)) &&
            potentialTypes.includes(cardType(x)) &&
            !x.known
          );
        })
        .sort((a, b) => a.dueDate! - b.dueDate!);
    }

    const candidate = getRandomNext(candidates);
    return candidate ? [candidate, cardType(candidate)] : [null, ""];
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

  async function nextPractice(
    state: ReviewInfosType,
    activityConfig: RepetrobesActivityConfigType,
  ) {
    let currentCard: CardType | null = null;
    let curNewWordIndex = 0;
    let cardType: string;
    let definition: DefinitionType | null = null;

    const [newToday, revisionsToday, possibleRevisionsToday] = getTodaysCounters(
      state,
      activityConfig,
    );
    let getNew = true;
    if (newToday >= activityConfig.maxNew) {
      getNew = false;
    }
    if (newToday / revisionsToday > activityConfig.maxNew / activityConfig.maxRevisions) {
      getNew = false;
    }
    if (state.potentialWords.length > 0 && state.curNewWordIndex < state.potentialWords.length) {
      [curNewWordIndex, cardType] = await newCard(
        state.existingCards,
        state.curNewWordIndex,
        state.potentialWords,
        activityConfig.activeCardTypes,
      );
      currentCard = {
        ...EMPTY_CARD,
        id: state.potentialWords[curNewWordIndex].id + CARD_ID_SEPARATOR + cardType,
      };
      definition = state.potentialWords[curNewWordIndex];
    }

    if (!(getNew && currentCard)) {
      const [reviewCard, _reviewCardType] = await newRevisionFromState(state, activityConfig);
      if (!getNew && reviewCard) {
        currentCard = reviewCard;
        definition = state.existingWords.get(wordId(reviewCard)) || null;
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
      revisionsToday,
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

    if (!definition || wordIdStr !== wordId(currentCard!))
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
        if (!newExisting.has(wordId(practicedCard))) {
          const practicedWord = daState.allNonReviewedWordsMap.get(wordId(practicedCard));
          if (!practicedWord) {
            throw new Error("Incoherent allNonReviewedWordsMap");
          }
          newExisting = new Map(daState.existingWords).set(wordId(practicedCard), practicedWord);
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

  const ac = stateActivityConfig;
  return (
    <IconContext.Provider value={{ color: "blue", size: "3em" }}>
      <div style={{ padding: "1em" }}>
        <LauncherStyle>
          <RepetrobesConfigLauncher
            loading={loading}
            activityConfig={ac}
            onConfigChange={handleConfigChange}
          />
          {ac.showProgress && (
            <Progress
              activityConfig={ac}
              newToday={daState.newToday}
              revisionsToday={daState.revisionsToday}
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
            loading={loading}
            onPractice={handlePractice}
            onShowAnswer={handleShowAnswer}
          />
        </div>
      </div>
    </IconContext.Provider>
  );
}

export default Repetrobes;
