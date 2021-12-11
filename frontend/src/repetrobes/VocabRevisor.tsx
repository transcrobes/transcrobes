import styled from "styled-components";
import { ReactElement } from "react";
import { Button } from "@material-ui/core";

import SearchLoading from "../components/SearchLoading";
import { CARD_ID_SEPARATOR, CARD_TYPES, getWordId } from "../database/Schema";
import { say, wordIdsFromModels } from "../lib/funclib";
import PracticerInput from "../components/PracticerInput";
import DefinitionGraph from "../components/DefinitionGraph";
import {
  CardType,
  CharacterType,
  DefinitionType,
  PosSentences,
  RepetrobesActivityConfigType,
} from "../lib/types";
import Loader from "../img/loader.gif";
import Meaning from "../components/Meaning";
import { setGlossing, setLangPair, setSegmentation, USER_STATS_MODE } from "../lib/lib";
import { getUserCardWords, setPlatformHelper } from "../lib/components";
import RecentSentencesElement from "../components/RecentSentencesElement";

const DATA_SOURCE = "VocabRevisor.tsx";

const CentredFlex = styled.div`
  display: flex;
  justify-content: center;
  padding: 0.2em;
`;
const QuestionWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1em;
`;
const AnswerWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1em;
`;
const GraphSoundQuestionStyle = styled.div`
  font-size: 4em;
  padding: 0.5em;
`;
const StyledAnswer = styled.div`
  display: flex;
  justify-content: center;
  font-size: 2em;
  padding: 0.5em;
`;
const StyledQuestion = styled.div`
  font-size: 2em;
  padding: 1em;
`;
const MeaningWrapper = styled.div`
  display: block;
`;

interface GraphQuestionProps {
  card: CardType;
  characters: CharacterType[];
}

function GraphQuestion({ card, characters }: GraphQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      {" "}
      {card && card.front ? (
        card.front
      ) : (
        <DefinitionGraph characters={characters} showAnswer={true}></DefinitionGraph>
      )}{" "}
    </GraphSoundQuestionStyle>
  );
}

interface SoundQuestionProps {
  card: CardType;
  definition: DefinitionType;
  characters: CharacterType[];
  showAnswer: boolean;
}

function SoundQuestion({
  card,
  definition,
  characters,
  showAnswer,
}: SoundQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      <CentredFlex>{card && card.front ? card.front : definition.sound}</CentredFlex>
      <CentredFlex>
        <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
          Say it!
        </Button>
      </CentredFlex>
      <DefinitionGraph characters={characters} showAnswer={showAnswer}></DefinitionGraph>
    </GraphSoundQuestionStyle>
  );
}

interface MeaningQuestionProps {
  card: CardType;
  definition: DefinitionType;
  showSynonyms: boolean;
  showL2LengthHint: boolean;
  characters: CharacterType[];
  showAnswer: boolean;
  onCardFrontUpdate: (card: CardType) => void;
}

function MeaningQuestion({
  card,
  definition,
  showSynonyms,
  showL2LengthHint,
  characters,
  showAnswer,
  onCardFrontUpdate,
}: MeaningQuestionProps): ReactElement {
  return (
    <div>
      <StyledQuestion>
        <MeaningWrapper>
          <Meaning
            showSynonyms={showSynonyms}
            definition={definition}
            card={card}
            onCardFrontUpdate={onCardFrontUpdate}
          />
          {showL2LengthHint && <div key="lenHint">(L2 length: {definition.graph.length})</div>}
        </MeaningWrapper>
      </StyledQuestion>
      <DefinitionGraph characters={characters} showAnswer={showAnswer}></DefinitionGraph>
    </div>
  );
}

interface SoundGraphAnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showRecents: boolean;
  onCardFrontUpdate: (card: CardType) => void;
}

function GraphAnswer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  onCardFrontUpdate,
}: SoundGraphAnswerProps): ReactElement {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <CentredFlex>
            <StyledAnswer> {definition.sound} </StyledAnswer>
            <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
              Say it!
            </Button>
          </CentredFlex>
          <MeaningWrapper>
            <Meaning
              showSynonyms={showSynonyms}
              definition={definition}
              card={card}
              onCardFrontUpdate={onCardFrontUpdate}
            />
          </MeaningWrapper>
          {showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}
        </>
      )}
    </div>
  );
}

function SoundAnswer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  onCardFrontUpdate,
}: SoundGraphAnswerProps): ReactElement {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <MeaningWrapper>
            <Meaning
              showSynonyms={showSynonyms}
              definition={definition}
              card={card}
              onCardFrontUpdate={onCardFrontUpdate}
            />
          </MeaningWrapper>
          {showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}
        </>
      )}
    </div>
  );
}

interface MeaningAnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showRecents: boolean;
}

function MeaningAnswer({
  card,
  definition,
  recentSentences,
  showRecents,
}: MeaningAnswerProps): ReactElement {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <CentredFlex>
            <StyledAnswer> {definition.sound} </StyledAnswer>
            <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
              Say it!
            </Button>
          </CentredFlex>
          <CentredFlex>
            {showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}
          </CentredFlex>
        </>
      )}
    </div>
  );
}

function getAnswer(
  card: CardType,
  definition: DefinitionType,
  recentSentences: PosSentences | null,
  showSynonyms: boolean,
  showRecents: boolean,
  onCardFrontUpdate: (card: CardType) => void,
): ReactElement {
  const cardType = card.id.split(CARD_ID_SEPARATOR)[1];
  switch (cardType) {
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
    default:
      return <></>;
  }
}

function getQuestion(
  card: CardType,
  definition: DefinitionType,
  characters: CharacterType[],
  showSynonyms: boolean,
  showL2LengthHint: boolean,
  showAnswer: boolean,
  onCardFrontUpdate: (card: CardType) => void,
) {
  console.debug(`Card to show for a question`, card);
  const cardType = card.id.split(CARD_ID_SEPARATOR)[1];
  switch (cardType) {
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
  }
}

interface Props {
  showAnswer: boolean;
  currentCard: CardType | null;
  definition: DefinitionType | null;
  characters: CharacterType[] | null;
  recentPosSentences: PosSentences | null;
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
    Object.entries(recentPosSentences).forEach(([pos, s]) => {
      const lemma = definition.graph;
      if (s) {
        s.forEach((sent) => {
          const now = Date.now() + Math.random();
          sent.sentence.t.forEach((t) => {
            if (t.l == lemma && t.pos === pos) {
              t.style = { color: "green", "font-weight": "bold" };
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
          // setLoaded(true);
        });
      document.addEventListener("click", () => {
        document.querySelectorAll("token-details").forEach((el) => el.remove());
      });
    });
  }

  return (
    <>
      {loading && <SearchLoading src={Loader} />}
      {!loading && !definition && <span>No review items loaded</span>}
      {!loading && !!definition && !!currentCard && !!characters && (
        <>
          <QuestionWrapper>
            {getQuestion(
              currentCard,
              definition,
              characters,
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
            <>
              <AnswerWrapper>
                {getAnswer(
                  currentCard,
                  definition,
                  recentPosSentences,
                  showSynonyms,
                  showRecents,
                  onCardFrontUpdate,
                )}
              </AnswerWrapper>
              <PracticerInput wordId={getWordId(currentCard)} onPractice={handlePractice} />
            </>
          )}
        </>
      )}
    </>
  );
}

export default VocabRevisor;
