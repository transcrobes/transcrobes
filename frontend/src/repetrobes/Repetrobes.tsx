import { Box, useTheme } from "@mui/material";
import _ from "lodash";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import { Loading } from "../components/Loading";
import WatchDemo from "../components/WatchDemo";
import { DataManager } from "../data/types";
import { setSettingsValue } from "../lib/appSettings";
import { configIsUsable } from "../lib/funclib";
import {
  CurrentCardFullInfo,
  DOCS_DOMAIN,
  EMPTY_CARD,
  REPETROBES_YT_VIDEO,
  RepetrobesActivityConfigType,
  SrsStatusData,
  USER_STATS_MODE,
} from "../lib/types";
import { practiceCardsForWords } from "../workers/common-db";
import { CARD_TYPES, GRADE, getCardId, getCardType, getWordId } from "../workers/rxdb/Schema";
import Progress from "./Progress";
import RepetrobesConfigLauncher from "./RepetrobesConfigLauncher";
import VocabRevisor from "./VocabRevisor";
import { getUserConfig } from "./funclib";

const DATA_SOURCE = "Repetrobes.tsx";

interface RepetrobesProps {
  proxy: DataManager;
}

export type TodaysReviewsInfoType = {
  newToday: number;
  completedNewToday: number;
  availableNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
};

function tmpConvert(srsStatusData: SrsStatusData): TodaysReviewsInfoType {
  return {
    newToday: srsStatusData.nbNewDone + srsStatusData.nbNewToRepeat,
    completedNewToday: srsStatusData.nbNewDone,
    availableNewToday: srsStatusData.nbAvailableNew,
    revisionsToday: srsStatusData.nbRevisionsDone + srsStatusData.nbRevisionsToRepeat,
    completedRevisionsToday: srsStatusData.nbRevisionsDone,
    possibleRevisionsToday: srsStatusData.nbAvailableRevisions,
  };
}

function Repetrobes({ proxy }: RepetrobesProps): ReactElement {
  const translate = useTranslate();
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(translate("screens.repetrobes.personalising_cards"));
  const [loading, setLoading] = useState<boolean>(false);
  const [stateActivityConfig, setStateActivityConfig] = useState<RepetrobesActivityConfigType>();
  const [currentCardInfo, setCurrentCardInfo] = useState<CurrentCardFullInfo | null>();
  const [todaysReviewsInfo, setTodaysReviewsInfo] = useState<TodaysReviewsInfoType>({
    newToday: 0,
    completedNewToday: 0,
    availableNewToday: 0,
    revisionsToday: 0,
    completedRevisionsToday: 0,
    possibleRevisionsToday: 0,
  });

  const defaultProviderOrder = useAppSelector((state) => state.userData.user.translationProviders);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);

  const windowEndRef = useRef<HTMLDivElement>(null);
  const windowBeginRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (windowBeginRef.current && windowEndRef.current) {
      (showAnswer ? windowEndRef.current : windowBeginRef.current).scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [showAnswer]);

  useEffect(() => {
    (async () => {
      const conf = await getUserConfig(proxy);
      console.debug("Repetrobes.tsx: getUserConfig returned", conf);

      const activityConfigNew: RepetrobesActivityConfigType = {
        ...stateActivityConfig,
        ...conf,
        translationProviderOrder:
          conf.translationProviderOrder ||
          defaultProviderOrder.reduce((acc, next, ind) => ({ ...acc, [next]: ind }), {} as Record<string, number>),
      };
      console.debug("Repetrobes.tsx: activityConfigNew", activityConfigNew);
      setStateActivityConfig(activityConfigNew);
      setLoadingMessage(translate("screens.repetrobes.personalising_cards"));
    })();
  }, []);

  useEffect(() => {
    if (stateActivityConfig) {
      (async () => {
        const usable = configIsUsable(stateActivityConfig);
        if (!usable) {
          console.debug(
            "Activity config is not usable after proxy.loaded, stateActivityConfig, not doing anything",
            stateActivityConfig,
          );
          setLoadingMessage(
            usable === undefined
              ? translate("screens.repetrobes.personalising_cards")
              : translate("screens.repetrobes.settings_incomplete"),
          );
          setLoading(true);
        } else {
          const rcIds = stateActivityConfig.activeCardTypes.find(
            (x) => x.selected && parseInt(x.value) === CARD_TYPES.PHRASE,
          )
            ? await proxy.getAvailableRecentSentenceIds()
            : [];
          await proxy.refreshTempRecentSentenceIds(rcIds);
          const [nc, srsStatusData] = (await nextPractice(stateActivityConfig)) || [];
          if (nc) setCurrentCardInfo(nc);
          if (srsStatusData) setTodaysReviewsInfo(tmpConvert(srsStatusData));
          setLoadingMessage(translate("screens.repetrobes.personalising_cards"));
          setLoading(!(!!nc?.card && !!nc.definition));
        }
      })();
    }
  }, [stateActivityConfig]);

  // FIXME: seriously consider typing lookupEvents
  async function submitLookupEvents(lookupEvents: any[], userStatsMode: number) {
    proxy.submitLookupEvents({ lemmaAndContexts: lookupEvents, userStatsMode, source: DATA_SOURCE });
  }

  async function handleCardFrontUpdate(cardId: string, frontString: string) {
    // TODO: Here we don't need to update the card in the proxy because we're not changing the card's
    // cards properties... except the updatedAt... maybe we should update here?
    // Or maybe just let a separate cloud db down sync do it? That would be better to have eventually!
    await proxy.setCardFront(cardId, frontString);
  }

  function handleConfigChange(activityConfig: RepetrobesActivityConfigType) {
    if (!_.isEqual(activityConfig, stateActivityConfig)) {
      setLoadingMessage(translate("screens.repetrobes.personalising_cards"));
      setLoading(true);
      setStateActivityConfig(activityConfig);
      setSettingsValue("repetrobes", "config", JSON.stringify(activityConfig));
    }
    setShowAnswer(false);
  }

  async function nextPractice(
    activityConfig: RepetrobesActivityConfigType,
  ): Promise<[CurrentCardFullInfo | null, SrsStatusData]> {
    const [nc, srsStatusData] = (await proxy.getPracticeCard(activityConfig, fromLang)) || [];
    console.log("nextPractice returned", nc);
    if (!nc) return [null, srsStatusData];
    const fullCard = (
      await proxy.getByIds({
        collection: "cards",
        ids: [getCardId(nc.card.wordId, nc.card.cardType)],
      })
    )[0];
    const card = fullCard || { ...EMPTY_CARD, id: getCardId(nc.card.wordId, nc.card.cardType) };
    return [
      {
        ...nc,
        card,
        recentSentences:
          getCardType(card.id) === CARD_TYPES.PHRASE.toString()
            ? (await proxy.getRecentSentences([getWordId(card.id)]))?.[0]?.[1]
            : undefined,
      },
      srsStatusData,
    ];
  }

  async function handlePractice(_, grade: number): Promise<void> {
    if (!stateActivityConfig) throw new Error("Invalid state, no stateActivityConfig");
    const { badReviewWaitSecs } = stateActivityConfig;
    setLoadingMessage("");
    setLoading(true);

    if (!currentCardInfo) throw new Error("Invalid state, no currentCardInfo");

    if (grade < GRADE.HARD) {
      // we consider it a lookup, otherwise we wouldn't have needed to look it up
      const lookupEvent = { target_word: currentCardInfo?.definition.graph, target_sentence: "" };
      submitLookupEvents([lookupEvent], USER_STATS_MODE.L1);
    }
    const userEvent = {
      type: "practice_card",
      data: {
        target_word: currentCardInfo?.definition.graph,
        grade: grade,
        source_sentence: "",
      },
      source: DATA_SOURCE,
    };
    proxy.submitUserEvents(userEvent);

    await practiceCardsForWords(proxy, [
      {
        wordId: getWordId(currentCardInfo.card.id),
        cardType: parseInt(getCardType(currentCardInfo.card.id)),
        grade,
        badReviewWaitSecs,
      },
    ]);
    const [nc, srsStatusData] = (await nextPractice(stateActivityConfig)) || [];
    if (nc) setCurrentCardInfo(nc);
    if (srsStatusData) setTodaysReviewsInfo(tmpConvert(srsStatusData));

    setShowAnswer(false);
    setLoadingMessage("");
    setLoading(false);
  }
  const theme = useTheme();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/repetrobes/`;
  return (
    <div>
      <div ref={windowBeginRef} />
      <TopToolbar
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {stateActivityConfig && (
          <RepetrobesConfigLauncher activityConfig={stateActivityConfig} onConfigChange={handleConfigChange} />
        )}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          {stateActivityConfig?.showProgress && (
            <Progress
              currentIsNew={
                currentCardInfo?.card?.firstRevisionDate === 0 ||
                (currentCardInfo?.card?.firstRevisionDate || 0) > stateActivityConfig.todayStarts
              }
              activityConfig={stateActivityConfig}
              newToday={todaysReviewsInfo?.newToday || 0}
              completedNewToday={todaysReviewsInfo?.completedNewToday || 0}
              availableNewToday={todaysReviewsInfo?.availableNewToday || 0}
              revisionsToday={todaysReviewsInfo?.revisionsToday || 0}
              completedRevisionsToday={todaysReviewsInfo?.completedRevisionsToday || 0}
              possibleRevisionsToday={todaysReviewsInfo?.possibleRevisionsToday || 0}
            />
          )}
          <WatchDemo url={REPETROBES_YT_VIDEO} />
          <HelpButton url={helpUrl} />
        </Box>
      </TopToolbar>
      <Loading show={loading} message={loadingMessage} />
      {stateActivityConfig && currentCardInfo && (
        <VocabRevisor
          loading={loading}
          proxy={proxy}
          theme={theme}
          showAnswer={showAnswer}
          activityConfig={stateActivityConfig}
          currentCard={currentCardInfo.card}
          characters={currentCardInfo.characters}
          definition={currentCardInfo.definition}
          recentPosSentences={currentCardInfo.recentSentences}
          onCardFrontUpdate={handleCardFrontUpdate}
          onPractice={handlePractice}
          onShowAnswer={() => setShowAnswer(true)}
        />
      )}
      <div ref={windowEndRef} />
    </div>
  );
}

export default Repetrobes;
