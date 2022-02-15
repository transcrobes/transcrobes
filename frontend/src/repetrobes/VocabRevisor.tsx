import { Button, Theme } from "@material-ui/core";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import PracticerInput from "../components/PracticerInput";
import { CARD_TYPES, getCardType, getWordId } from "../database/Schema";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  PosSentences,
  RecentSentencesType,
  RepetrobesActivityConfigType,
} from "../lib/types";
import { AnswerWrapper, CentredFlex, QuestionWrapper } from "./Common";
import GraphAnswer from "./GraphAnswer";
import GraphQuestion from "./GraphQuestion";
import MeaningAnswer from "./MeaningAnswer";
import MeaningQuestion from "./MeaningQuestion";
import PhraseAnswer from "./PhraseAnswer";
import PhraseQuestion from "./PhraseQuestion";
import SoundAnswer from "./SoundAnswer";
import SoundQuestion from "./SoundQuestion";

dayjs.extend(utc);
dayjs.extend(timezone);

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
      return <SoundQuestion card={card} definition={definition} characters={characters} showAnswer={showAnswer} />;
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
      return <PhraseQuestion recentSentences={recentSentences} showAnswer={showAnswer} characters={characters} />;
    default:
      console.error("Unsupported cardType error", card, getCardType(card));
      throw new Error("Unsupported cardType");
  }
}

interface Props {
  proxy: ServiceWorkerProxy;
  theme: Theme;
  showAnswer: boolean;
  currentCard: CardType | null;
  definition: DefinitionType | null;
  characters: CharacterType[] | null;
  recentPosSentences: RecentSentencesType | null;
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
  const premature = currentCard && currentCard?.dueDate > dayjs().unix();
  console.log(
    "prematurity",
    premature,
    currentCard,
    definition,
    currentCard?.dueDate,
    currentCard?.updatedAt,
    dayjs().unix(),
    dayjs(currentCard?.dueDate),
    dayjs(currentCard?.updatedAt),
    dayjs.tz.guess(),
    dayjs(currentCard?.dueDate || 0 * 1000)
      .tz(dayjs.tz.guess())
      .format("YYYY-MM-DD HH:mm:ss"),
    dayjs().tz(dayjs.tz.guess()).format("YYYY-MM-DD HH:mm:ss"),
  );
  const loading = useAppSelector((state) => state.ui.loading);
  return (
    <>
      {!loading && !definition && <span>No review items loaded</span>}
      {!loading && !!definition && !!currentCard && !!characters && (
        <>
          {premature && (
            <div style={{ backgroundColor: premature ? "orange" : "inherit", textAlign: "center" }}>
              Card not due until{" "}
              {dayjs(currentCard.dueDate * 1000)
                .tz(dayjs.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss")}
            </div>
          )}
          <QuestionWrapper style={{ backgroundColor: premature ? "orange" : "inherit" }}>
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
