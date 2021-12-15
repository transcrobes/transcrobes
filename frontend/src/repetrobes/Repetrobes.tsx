import { ReactElement, useEffect, useState } from "react";
import dayjs from "dayjs";
import _ from "lodash";

import { GRADE, getWordId, getCardType, getCardId } from "../database/Schema";
import RepetrobesConfigLauncher from "./RepetrobesConfigLauncher";
import VocabRevisor from "./VocabRevisor";
import { USER_STATS_MODE } from "../lib/lib";

import {
  CardType,
  CharacterType,
  DailyReviewables,
  DefinitionType,
  EMPTY_CARD,
  RecentSentencesStoredType,
  RecentSentencesType,
  RepetrobesActivityConfigType,
  ReviewablesInfoType,
  UserListWordType,
} from "../lib/types";
import { ServiceWorkerProxy } from "../lib/proxies";
import { setSettingsValue } from "../lib/appSettings";
import { configIsUsable } from "../lib/funclib";
import { recentSentencesFromLZ } from "../lib/data";
import Progress from "./Progress";
import { getRandomNext } from "./Common";
import { EMPTY_ACTIVITY, getUserConfig } from "./funclib";
import { TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { makeStyles, Theme } from "@material-ui/core";
import { IconContext } from "react-icons";

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

const useStyles = makeStyles((theme: Theme) => ({
  toolbar: {
    justifyContent: "space-between",
  },
  revisor: {
    padding: "1em",
  },
  progress: {
    display: "flex",
    alignItems: "center",
  },
}));

interface RepetrobesProps {
  proxy: ServiceWorkerProxy;
}

function Repetrobes({ proxy }: RepetrobesProps): ReactElement {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userListWords, setUserListWords] = useState<UserListWordType>({});

  const [daState, setDaState] = useState<ReviewablesInfoType>(EMPTY_STATE);
  const [stateActivityConfig, setStateActivityConfig] =
    useState<RepetrobesActivityConfigType>(EMPTY_ACTIVITY);

  useEffect(() => {
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
      };
      const reviewLists = await proxy.sendMessagePromise<DailyReviewables>({
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
        console.debug("the partial is", partial);
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

  function getValidExisting(
    existingCards: Map<string, CardType>,
    activityConfig: RepetrobesActivityConfigType,
  ): Map<string, CardType> {
    const potentialTypes = activityConfig.activeCardTypes
      .filter((x) => x.selected)
      .map((x) => x.value.toString());

    const validExisting: Map<string, CardType> = new Map<string, CardType>();
    for (const [k, v] of existingCards) {
      if (
        !v.known &&
        (!activityConfig.onlySelectedWordListRevisions || !isListFiltered(v, activityConfig)) &&
        potentialTypes.includes(getCardType(v))
      ) {
        validExisting.set(k, v);
      }
    }
    return validExisting;
  }

  async function nextPractice(
    state: ReviewablesInfoType,
    activityConfig: RepetrobesActivityConfigType,
  ) {
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
      [...state.existingCards.values()]
        .filter((c) => c.lastRevisionDate > todayStarts)
        .map((c) => getWordId(c)),
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
        !wordIdsReviewedToday.has(getWordId(cardId))
      ) {
        possibleRevisionsToday.add(cardId);
        toRereviewQueue.set(cardId, card);
      }
    }
    let getNew = newToday.size < activityConfig.maxNew;
    console.log(
      "getNew false at the start",
      getNew,
      possibleRevisionsToday,
      new Set([...possibleRevisionsToday].map((c) => getWordId(c))),
    );

    const filteredPossibleRevisionsToday = new Set(
      [...possibleRevisionsToday].map((c) => getWordId(c)),
    ).size;
    const allRevisionsToday = revisionsToday.size + filteredPossibleRevisionsToday;
    const availableNewToday = state.potentialCardsMap.size;
    const allNewToday = newToday.size + availableNewToday;

    if (
      newToday.size / revisionsToday.size >
      Math.min(allNewToday, activityConfig.maxNew) /
        Math.min(allRevisionsToday, activityConfig.maxRevisions)
    ) {
      getNew = false;
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
      definition = state.allReviewableDefinitions.get(wordId) || null;
    } else {
      getNew = false; // strictly only useful for logging...
    }

    console.debug("Next practice new card", getNew, currentCard, state.potentialCardsMap);
    if (!(getNew && currentCard)) {
      const candidates = [...toRereviewQueue.values()].sort((a, b) => a.dueDate - b.dueDate);
      const readyCandidates = candidates.filter((x) => x.dueDate <= dayjs().unix());
      console.log("sorted candidates and readies", candidates, readyCandidates);
      let reviewCard: CardType;
      if (readyCandidates.length > 0) {
        reviewCard = getRandomNext(readyCandidates);
      } else {
        reviewCard = candidates[0];
      }
      // const [reviewCard, _reviewCardType] = await newRevisionFromState(state, activityConfig);
      // console.debug("Next practice review card", reviewCard, _reviewCardType);

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
        currentCard = reviewCard;
        definition = state.allReviewableDefinitions.get(getWordId(reviewCard)) || null;
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
      }
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
        const potentialCardsMap = new Map(daState.potentialCardsMap);
        potentialCardsMap.delete(getWordId(practicedCard));
        const newState = {
          ...daState,
          potentialCardsMap,
          existingCards: new Map(daState.existingCards).set(practicedCard.id, practicedCard),
        };

        nextPractice(newState, stateActivityConfig).then((nextState) => {
          console.log("Got nextPractice, should be setting loading to false");
          setShowAnswer(false);
          setLoading(false);
          setDaState({ ...nextState });
        });
        return "success";
      },
    );
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
  const classes = useStyles();
  const helpUrl = "https://transcrob.es/page/software/learn/repetrobes/";
  const ac = stateActivityConfig;
  return (
    <div>
      <TopToolbar className={classes.toolbar}>
        <RepetrobesConfigLauncher activityConfig={ac} onConfigChange={handleConfigChange} />
        <div className={classes.progress}>
          {ac.showProgress && (
            <Progress
              activityConfig={ac}
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
      <div>
        <IconContext.Provider value={{ color: "blue", size: "3em" }}>
          <VocabRevisor
            showAnswer={showAnswer}
            activityConfig={stateActivityConfig}
            currentCard={daState.currentCard}
            characters={daState.characters}
            definition={daState.definition}
            recentPosSentences={posSentencesFromRecent(daState)}
            loading={loading}
            onCardFrontUpdate={handleCardFrontUpdate}
            onPractice={handlePractice}
            onShowAnswer={handleShowAnswer}
          />
        </IconContext.Provider>
      </div>
    </div>
  );
}

export default Repetrobes;
