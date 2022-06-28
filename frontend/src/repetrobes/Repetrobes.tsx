import { useTheme } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import dayjs from "dayjs";
import _ from "lodash";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar } from "react-admin";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import { getCardId, getCardType, getWordId, GRADE } from "../database/Schema";
import { setLoading } from "../features/ui/uiSlice";
import { setSettingsValue } from "../lib/appSettings";
import { configIsUsable, recentSentencesFromLZ } from "../lib/funclib";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DailyReviewables,
  debug,
  DefinitionType,
  DOCS_DOMAIN,
  EMPTY_CARD,
  log,
  RecentSentencesStoredType,
  RecentSentencesType,
  RepetrobesActivityConfigType,
  ReviewablesInfoType,
  UserListWordType,
  USER_STATS_MODE,
} from "../lib/types";
import { getRandomNext } from "./Common";
import { EMPTY_ACTIVITY, getUserConfig } from "./funclib";
import Progress from "./Progress";
import RepetrobesConfigLauncher from "./RepetrobesConfigLauncher";
import VocabRevisor from "./VocabRevisor";

const DATA_SOURCE = "Repetrobes.tsx";

const EMPTY_STATE = {
  characters: null,
  definition: null,
  currentCard: null,
  recentSentences: new Map<string, RecentSentencesStoredType>(),
  existingCards: new Map<string, CardType>(),
  allPotentialCharacters: new Map<string, CharacterType>(),
  allReviewableDefinitions: new Map<string, DefinitionType>(),
  potentialCardsMap: new Map<string, Set<string>>(),
  newToday: 0,
  completedNewToday: 0,
  availableNewToday: 0,
  revisionsToday: 0,
  completedRevisionsToday: 0,
  possibleRevisionsToday: 0,
};

const useStyles = makeStyles()({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  revisor: {
    padding: "1em",
  },
  progress: {
    display: "flex",
    alignItems: "center",
  },
});

interface RepetrobesProps {
  proxy: ServiceWorkerProxy;
}

function Repetrobes({ proxy }: RepetrobesProps): ReactElement {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userListWords, setUserListWords] = useState<UserListWordType>({});

  const [daState, setDaState] = useState<ReviewablesInfoType>(EMPTY_STATE);
  const [stateActivityConfig, setStateActivityConfig] = useState<RepetrobesActivityConfigType>(EMPTY_ACTIVITY);

  const defaultProviderOrder = useAppSelector((state) => state.userData.user.translationProviders);

  const windowEndRef = useRef<HTMLDivElement>(null);
  const windowBeginRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (windowBeginRef.current && windowEndRef.current) {
      (showAnswer ? windowEndRef.current : windowBeginRef.current).scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [showAnswer]);

  useEffect(() => {
    if (!proxy.loaded) return;
    (async () => {
      const conf = await getUserConfig(proxy);
      const ulws = await proxy.sendMessagePromise<{
        userListWords: UserListWordType;
      }>({
        source: DATA_SOURCE,
        type: "getUserListWords",
        value: {},
      });
      setUserListWords(ulws.userListWords);
      const activityConfigNew = {
        ...stateActivityConfig,
        ...conf,
        translationProviderOrder:
          conf.translationProviderOrder ||
          defaultProviderOrder.reduce((acc, next, ind) => ({ ...acc, [next]: ind }), {} as Record<string, number>),
      } as RepetrobesActivityConfigType;
      const reviewLists = await proxy.sendMessagePromise<DailyReviewables>({
        source: DATA_SOURCE,
        type: "getSRSReviews",
        value: activityConfigNew,
      });
      const tempState = {
        ...daState,
        ...reviewLists,
      };
      debug("Config set up, about to get the next practice item", tempState);
      nextPractice(tempState, activityConfigNew).then((practiceOut) => {
        const partial = { ...tempState, ...practiceOut };
        debug("The partial state is", partial);
        dispatch(setLoading(!(!!partial.currentCard && !!partial.definition)));
        setDaState({
          ...daState,
          ...partial,
        });
        setStateActivityConfig(activityConfigNew);
      });
    })();
  }, [proxy.loaded]);

  useEffect(() => {
    (async () => {
      if (!configIsUsable(stateActivityConfig)) {
        console.log("Activity config is not usable, not doing anything", stateActivityConfig);
        dispatch(setLoading(true));
        return;
      }
      dispatch(setLoading(!(!!daState.currentCard && !!daState.definition)));
    })();
  }, [daState]);

  useEffect(() => {
    if (!proxy.loaded) return;
    (async () => {
      if (!configIsUsable(stateActivityConfig)) {
        console.log("Activity config is not usable, not doing anything", stateActivityConfig);
        dispatch(setLoading(true));
        return;
      }
      const reviewLists = await proxy.sendMessagePromise<DailyReviewables>({
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
      dispatch(setLoading(!(!!daState.currentCard && !!daState.definition)));
      setDaState({ ...daState, ...partial });
    })();
  }, [proxy.loaded, stateActivityConfig]);

  // FIXME: seriously consider typing lookupEvents
  async function submitLookupEvents(lookupEvents: any[], userStatsMode: number) {
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "submitLookupEvents",
      value: { lemmaAndContexts: lookupEvents, userStatsMode, source: DATA_SOURCE },
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
      dispatch(setLoading(true));
      setStateActivityConfig(activityConfig);
      setSettingsValue("repetrobes", "config", JSON.stringify(activityConfig));
    }
    setShowAnswer(false);
  }

  function isListFiltered(card: CardType, activityConfig: RepetrobesActivityConfigType): boolean {
    if (!activityConfig.onlySelectedWordListRevisions || activityConfig.systemWordSelection) return false;
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

  function getValidExisting(
    existingCards: Map<string, CardType>,
    activityConfig: RepetrobesActivityConfigType,
  ): Map<string, CardType> {
    const potentialTypes = activityConfig.activeCardTypes.filter((x) => x.selected).map((x) => x.value.toString());

    const validExisting: Map<string, CardType> = new Map<string, CardType>();
    for (const [k, v] of existingCards) {
      if (
        !v.known &&
        (activityConfig.systemWordSelection ||
          !activityConfig.onlySelectedWordListRevisions ||
          !isListFiltered(v, activityConfig)) &&
        potentialTypes.includes(getCardType(v))
      ) {
        validExisting.set(k, v);
      }
    }
    return validExisting;
  }

  function getOverdueTodaysRepeat(
    toRereviewQueue: Map<string, CardType>,
    todayStarts: number,
    forceUnfinished: boolean,
  ) {
    // Check if we have a failed review from today that is due already
    const candidates = [...toRereviewQueue.values()].sort((a, b) => a.dueDate - b.dueDate);
    const readyCandidates = candidates.filter((x) => x.dueDate <= dayjs().unix());
    let overdueRepeatNow = readyCandidates.filter(
      (x) =>
        x.lastRevisionDate <= dayjs().add(-stateActivityConfig.badReviewWaitSecs, "seconds").unix() &&
        x.lastRevisionDate > todayStarts,
    );
    log("getOverdueTodaysRepeat", candidates, readyCandidates, overdueRepeatNow);
    if (overdueRepeatNow.length === 0 && forceUnfinished) {
      overdueRepeatNow = candidates.filter(
        (x) => x.lastRevisionDate >= dayjs().add(-stateActivityConfig.badReviewWaitSecs, "seconds").unix(),
      );
      log(
        "getOverdueTodaysRepeat looks like we are already over quota, finishing " +
          "those started, even if they aren't officially ready",
        candidates,
        readyCandidates,
        overdueRepeatNow,
      );
    }
    return { candidates, readyCandidates, goodCard: overdueRepeatNow[0] };
  }

  async function getNewCard(
    newToday: Set<string>,
    state: ReviewablesInfoType,
    activityConfig: RepetrobesActivityConfigType,
    possibleRevisionsToday: Set<string>,
    revisionsToday: Set<string>,
    filteredPossibleRevisionsToday: number,
    availableNewToday: number,
  ) {
    const allRevisionsToday = revisionsToday.size + filteredPossibleRevisionsToday;
    const allNewToday = newToday.size + availableNewToday;

    let currentCard: CardType | null = null;
    let getNew = newToday.size < activityConfig.maxNew;
    log(
      "getNew at the start",
      getNew,
      possibleRevisionsToday,
      new Set([...possibleRevisionsToday].map((c) => getWordId(c))),
    );

    if (
      newToday.size / revisionsToday.size >
      Math.min(allNewToday, activityConfig.maxNew) / Math.min(allRevisionsToday, activityConfig.maxRevisions)
    ) {
      getNew = false;
      debug("Setting getNew false due to ratio", getNew);
    }

    if (state.potentialCardsMap.size > 0) {
      const [wordId, cardTypes] = state.potentialCardsMap.entries().next().value;
      const cards = [...cardTypes].map((ct) => {
        return {
          ...EMPTY_CARD,
          id: getCardId(wordId, ct),
        };
      });
      currentCard = await unrevisedCard(getRandomNext(cards).id);
    } else {
      getNew = false; // strictly only useful for logging...
      debug("Setting getNew false due to no more left", getNew);
    }

    debug("Next practice new card", getNew, currentCard, state.potentialCardsMap);
    return { getNew, currentCard };
  }

  function getReviewCard(
    candidates: CardType[],
    readyCandidates: CardType[],
    newToday: Set<string>,
    availableNewToday: number,
    activityConfig: RepetrobesActivityConfigType,
  ) {
    console.log("sorted candidates and readies", candidates, readyCandidates);
    let reviewCard: CardType;
    // if something is already due, chose one of those
    if (readyCandidates.length > 0) {
      reviewCard = getRandomNext(readyCandidates);
    } else {
      const readyCandidates = candidates.filter(
        (x) => x.lastRevisionDate <= dayjs().add(-stateActivityConfig.badReviewWaitSecs, "seconds").unix(),
      );
      // else find something that is not something failed just now (and not yet ready)
      if (readyCandidates.length > 0) {
        reviewCard = getRandomNext(readyCandidates);
      } else {
        // else no good option, we either have nothing "fresh" left or we are failing badly...
        reviewCard = candidates[0];
      }
    }

    const allNewToday = newToday.size + availableNewToday;
    const todaysNewLimit = Math.min(allNewToday, activityConfig.maxNew);
    if (reviewCard && (reviewCard.dueDate < dayjs().unix() || newToday.size >= todaysNewLimit)) {
      console.debug(
        "Assigning review",
        reviewCard,
        reviewCard?.dueDate,
        dayjs().unix(),
        newToday.size >= todaysNewLimit,
        newToday,
        todaysNewLimit,
      );
      return reviewCard;
    } else {
      console.debug(
        "NOT Assigning review",
        reviewCard,
        reviewCard?.dueDate,
        dayjs().unix(),
        newToday.size >= todaysNewLimit,
        newToday,
        todaysNewLimit,
      );
      return null;
    }
  }

  async function nextPractice(state: ReviewablesInfoType, activityConfig: RepetrobesActivityConfigType) {
    let currentCard: CardType | null = null;
    let definition: DefinitionType | null = null;

    const newToday = new Set<string>();
    const completedNewToday = new Set<string>();
    const revisionsToday = new Set<string>();
    const completedRevisionsToday = new Set<string>();
    const possibleRevisionsToday = new Set<string>();
    const todayStarts = activityConfig.todayStarts;

    // all wordIds reviewed, regardless of whether their corresponding cards are currently filtered
    // this is so we don't do repeats
    const wordIdsReviewedToday = new Set<string>(
      [...state.existingCards.values()].filter((c) => c.lastRevisionDate > todayStarts).map((c) => getWordId(c)),
    );
    const toRereviewQueue = new Map<string, CardType>();

    for (const [cardId, card] of getValidExisting(state.existingCards, activityConfig)) {
      if (card.lastRevisionDate > todayStarts && card.firstRevisionDate >= todayStarts) {
        newToday.add(cardId);
        if (card.dueDate > dayjs.unix(todayStarts).add(1, "day").unix()) {
          completedNewToday.add(cardId);
        } else {
          toRereviewQueue.set(cardId, card);
        }
      } else if (card.lastRevisionDate > todayStarts && card.firstRevisionDate < todayStarts) {
        revisionsToday.add(cardId);
        if (card.dueDate > dayjs.unix(todayStarts).add(1, "day").unix()) {
          completedRevisionsToday.add(cardId);
        } else {
          toRereviewQueue.set(cardId, card);
        }
      } else if (
        card.lastRevisionDate <= todayStarts &&
        card.firstRevisionDate < todayStarts &&
        !wordIdsReviewedToday.has(getWordId(cardId)) &&
        card.dueDate < dayjs.unix(todayStarts).add(1, "day").unix()
      ) {
        possibleRevisionsToday.add(cardId);
        toRereviewQueue.set(cardId, card);
      }
    }
    const filteredPossibleRevisionsToday = new Set([...possibleRevisionsToday].map((c) => getWordId(c))).size;
    const availableNewToday = state.potentialCardsMap.size;

    const { candidates, readyCandidates, goodCard } = getOverdueTodaysRepeat(
      toRereviewQueue,
      todayStarts,
      newToday.size >= activityConfig.maxNew && revisionsToday.size >= activityConfig.maxRevisions,
    );
    if (goodCard) {
      currentCard = goodCard;
      console.log("Doing a re-review for today", currentCard);
    } else {
      const newStuff = await getNewCard(
        newToday,
        state,
        activityConfig,
        possibleRevisionsToday,
        revisionsToday,
        filteredPossibleRevisionsToday,
        availableNewToday,
      );
      if (!(newStuff.getNew && newStuff.currentCard)) {
        currentCard =
          getReviewCard(candidates, readyCandidates, newToday, availableNewToday, activityConfig) ||
          newStuff.currentCard;
        console.log("Either we don't need a new, or there isn't one to get", newStuff, currentCard);
      } else {
        console.log("We need a new, and we have one", newStuff);
        currentCard = newStuff.currentCard;
      }
    }
    if (currentCard) {
      definition = state.allReviewableDefinitions.get(getWordId(currentCard)) || null;
      console.log("The definition found for the current card is", currentCard, definition);
    } else {
      console.warn("The current card is null, this is the end of our revisions...");
    }
    const characters = definition ? getCharacters(state.allPotentialCharacters, definition) : null;
    return {
      ...state,
      currentCard,
      definition,
      characters,
      newToday: newToday.size,
      completedNewToday: completedNewToday.size,
      availableNewToday,
      revisionsToday: revisionsToday.size,
      completedRevisionsToday: completedRevisionsToday.size,
      possibleRevisionsToday: filteredPossibleRevisionsToday,
    };
  }

  function handleShowAnswer() {
    setShowAnswer(true);
  }

  async function handlePractice(wordIdStr: string, grade: number): Promise<void> {
    const { currentCard, definition } = daState;
    const { badReviewWaitSecs } = stateActivityConfig;
    dispatch(setLoading(true));

    if (!definition || wordIdStr !== getWordId(currentCard!)) throw new Error("Invalid state, no definition");

    if (grade < GRADE.HARD) {
      // we consider it a lookup, otherwise we wouldn't have needed to look it up
      const lookupEvent = { target_word: definition.graph, target_sentence: "" };
      submitLookupEvents([lookupEvent], USER_STATS_MODE.L1);
    }
    const userEvent = {
      type: "practice_card",
      data: {
        target_word: definition.graph,
        grade: grade,
        source_sentence: "",
      },
      source: DATA_SOURCE,
    };
    proxy.sendMessagePromise({ source: DATA_SOURCE, type: "submitUserEvents", value: userEvent });

    const practicedCard = await proxy.sendMessagePromise<CardType>({
      source: DATA_SOURCE,
      type: "practiceCard",
      value: { currentCard, grade, badReviewWaitSecs },
    });
    const potentialCardsMap = new Map(daState.potentialCardsMap);
    potentialCardsMap.delete(getWordId(practicedCard));
    const newState = {
      ...daState,
      potentialCardsMap,
      existingCards: new Map(daState.existingCards).set(practicedCard.id, practicedCard),
    };
    const nextState = await nextPractice(newState, stateActivityConfig);
    setShowAnswer(false);
    dispatch(setLoading(undefined));
    setDaState({ ...nextState });
  }
  function posSentencesFromRecent(theState: ReviewablesInfoType): RecentSentencesType | null {
    if (theState.definition?.id) {
      const rs = theState.recentSentences.get(theState.definition?.id);
      if (rs && rs.lzContent) {
        return recentSentencesFromLZ(theState.definition?.id, rs.lzContent) || null;
      }
    }
    return null;
  }
  const { classes } = useStyles();
  const theme = useTheme();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/repetrobes/`;
  return (
    <div>
      <div ref={windowBeginRef} />
      <TopToolbar className={classes.toolbar}>
        <RepetrobesConfigLauncher activityConfig={stateActivityConfig} onConfigChange={handleConfigChange} />
        <div className={classes.progress}>
          {stateActivityConfig.showProgress && (
            <Progress
              activityConfig={stateActivityConfig}
              newToday={daState.newToday}
              completedNewToday={daState.completedNewToday}
              availableNewToday={daState.availableNewToday}
              revisionsToday={daState.revisionsToday}
              completedRevisionsToday={daState.completedRevisionsToday}
              possibleRevisionsToday={daState.possibleRevisionsToday}
            />
          )}
          <HelpButton url={helpUrl} />
        </div>
      </TopToolbar>
      <Loading />
      <div>
        <VocabRevisor
          proxy={proxy}
          theme={theme}
          showAnswer={showAnswer}
          activityConfig={stateActivityConfig}
          currentCard={daState.currentCard}
          characters={daState.characters}
          definition={daState.definition}
          recentPosSentences={posSentencesFromRecent(daState)}
          onCardFrontUpdate={handleCardFrontUpdate}
          onPractice={handlePractice}
          onShowAnswer={handleShowAnswer}
        />
      </div>
      <div ref={windowEndRef} />
    </div>
  );
}

export default Repetrobes;
