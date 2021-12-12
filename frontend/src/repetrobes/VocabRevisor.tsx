import { ReactElement } from "react";
import { Button } from "@material-ui/core";

import SearchLoading from "../components/SearchLoading";
import { CARD_TYPES, getCardType, getWordId } from "../database/Schema";
import { wordIdsFromModels } from "../lib/funclib";
import PracticerInput from "../components/PracticerInput";
import {
  CardType,
  CharacterType,
  DefinitionType,
  PosSentences,
  RecentSentencesType,
  RepetrobesActivityConfigType,
} from "../lib/types";
import Loader from "../img/loader.gif";
import { setGlossing, setLangPair, setSegmentation, USER_STATS_MODE } from "../lib/lib";
import { getUserCardWords, setPlatformHelper } from "../lib/components";
import { AnswerWrapper, CentredFlex, QuestionWrapper } from "./Common";
import SoundQuestion from "./SoundQuestion";
import GraphQuestion from "./GraphQuestion";
import MeaningQuestion from "./MeaningQuestion";
import MeaningAnswer from "./MeaningAnswer";
import GraphAnswer from "./GraphAnswer";
import SoundAnswer from "./SoundAnswer";
import PhraseAnswer from "./PhraseAnswer";
import PhraseQuestion from "./PhraseQuestion";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

const DATA_SOURCE = "VocabRevisor.tsx";

function getAnswer(
  card: CardType,
  definition: DefinitionType,
  recentSentences: PosSentences | null,
  showSynonyms: boolean,
  showRecents: boolean,
  onCardFrontUpdate: (card: CardType) => void,
): ReactElement {
  switch (getCardType(card)) {
    case CARD_TYPES.GRAPH.toString():
      return (
        <GraphAnswer
          card={card}
          definition={definition}
          recentSentences={recentSentences}
          showSynonyms={showSynonyms}
          showRecents={showRecents}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      );
    case CARD_TYPES.SOUND.toString():
      return (
        <SoundAnswer
          card={card}
          definition={definition}
          recentSentences={recentSentences}
          showSynonyms={showSynonyms}
          showRecents={showRecents}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      );
    case CARD_TYPES.MEANING.toString():
      return (
        <MeaningAnswer
          recentSentences={recentSentences}
          showRecents={showRecents}
          card={card}
          definition={definition}
        />
      );
    case CARD_TYPES.PHRASE.toString():
      return (
        <PhraseAnswer
          card={card}
          definition={definition}
          recentSentences={recentSentences}
          showSynonyms={showSynonyms}
          showRecents={showRecents}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      );
    default:
      console.error("Unsupported cardType error", card, getCardType(card));
      throw new Error("Unsupported cardType");
  }
}

function getQuestion(
  card: CardType,
  definition: DefinitionType,
  characters: CharacterType[],
  recentSentences: PosSentences | null,
  showSynonyms: boolean,
  showL2LengthHint: boolean,
  showAnswer: boolean,
  onCardFrontUpdate: (card: CardType) => void,
) {
  console.debug(`Card to show for a question`, card);
  switch (getCardType(card)) {
    case CARD_TYPES.GRAPH.toString():
      return <GraphQuestion card={card} characters={characters} />;
    case CARD_TYPES.SOUND.toString():
      return (
        <SoundQuestion
          card={card}
          definition={definition}
          characters={characters}
          showAnswer={showAnswer}
        />
      );
    case CARD_TYPES.MEANING.toString():
      return (
        <MeaningQuestion
          card={card}
          definition={definition}
          characters={characters}
          showSynonyms={showSynonyms}
          showL2LengthHint={showL2LengthHint}
          showAnswer={showAnswer}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      );
    case CARD_TYPES.PHRASE.toString():
      return (
        <PhraseQuestion
          recentSentences={recentSentences}
          showAnswer={showAnswer}
          characters={characters}
        />
      );
    default:
      console.error("Unsupported cardType error", card, getCardType(card));
      throw new Error("Unsupported cardType");
  }
}

interface Props {
  showAnswer: boolean;
  currentCard: CardType | null;
  definition: DefinitionType | null;
  characters: CharacterType[] | null;
  recentPosSentences: RecentSentencesType | null;
  loading: boolean;
  activityConfig: RepetrobesActivityConfigType;
  onCardFrontUpdate: (card: CardType) => void;
  onPractice: (wordId: string, grade: number) => void;
  onShowAnswer: () => void;
}

export function VocabRevisor({
  showAnswer,
  currentCard,
  definition,
  characters,
  loading,
  activityConfig,
  recentPosSentences,
  onCardFrontUpdate,
  onPractice,
  onShowAnswer,
}: Props): ReactElement {
  function handlePractice(wordId: string, grade: number) {
    onPractice(wordId, grade);
  }
  const { showSynonyms, showL2LengthHint, showRecents } = activityConfig;

  setGlossing(USER_STATS_MODE.NO_GLOSS);
  setSegmentation(true);
  setLangPair(window.componentsConfig.langPair);
  setPlatformHelper(window.componentsConfig.proxy);

  if (recentPosSentences && definition) {
    window.transcrobesModel = window.transcrobesModel || {};
    Object.entries(recentPosSentences.posSentences).forEach(([pos, s]) => {
      const lemma = definition.graph;
      if (s) {
        s.forEach((sent) => {
          const now = Date.now() + Math.random();
          sent.sentence.t.forEach((t) => {
            if (t.l === lemma && t.pos === pos) {
              t.style = { color: "green", "font-weight": "bold" };
              t.de = true;
            }
          });
          window.transcrobesModel[now] = { id: now, s: [sent.sentence] };
          sent.modelId = now;
        });
      }
    });
    const uniqueIds = wordIdsFromModels(window.transcrobesModel);

    getUserCardWords().then(() => {
      window.componentsConfig.proxy
        .sendMessagePromise<DefinitionType[]>({
          source: DATA_SOURCE,
          type: "getByIds",
          value: { collection: "definitions", ids: [...uniqueIds] },
        })
        .then((definitions) => {
          window.cachedDefinitions = window.cachedDefinitions || new Map<string, DefinitionType>();
          definitions.map((definition) => {
            window.cachedDefinitions.set(definition.id, definition);
          });
        });
      document.addEventListener("click", () => {
        document.querySelectorAll("token-details").forEach((el) => el.remove());
      });
    });
  }
  const premature = currentCard && currentCard?.dueDate > dayjs().unix();
  console.log(
    "prematurity",
    premature,
    currentCard,
    currentCard?.dueDate,
    dayjs().unix(),
    dayjs(currentCard?.dueDate).format("LTS"),
  );
  return (
    <>
      {loading && <SearchLoading src={Loader} />}
      {!loading && !definition && <span>No review items loaded</span>}
      {!loading && !!definition && !!currentCard && !!characters && (
        <>
          <QuestionWrapper style={{ backgroundColor: premature ? "orange" : "inherit" }}>
            {premature && <div>Card not due until {dayjs(currentCard.dueDate).format("LTS")}</div>}
            {getQuestion(
              currentCard,
              definition,
              characters,
              recentPosSentences?.posSentences || null,
              showSynonyms,
              showL2LengthHint,
              showAnswer,
              onCardFrontUpdate,
            )}
          </QuestionWrapper>
          {!showAnswer && (
            <CentredFlex>
              <Button onClick={onShowAnswer} variant="contained" color="primary">
                Show Answer
              </Button>
            </CentredFlex>
          )}
          {showAnswer && (
            <div>
              <AnswerWrapper>
                {getAnswer(
                  currentCard,
                  definition,
                  recentPosSentences?.posSentences || null,
                  showSynonyms,
                  showRecents,
                  onCardFrontUpdate,
                )}
              </AnswerWrapper>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: "800px" }}>
                  <PracticerInput wordId={getWordId(currentCard)} onPractice={handlePractice} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default VocabRevisor;
