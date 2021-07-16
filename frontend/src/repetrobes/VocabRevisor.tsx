import styled from "styled-components";

import SearchLoading from "../components/SearchLoading";
import { CARD_ID_SEPARATOR, CARD_TYPES, wordId } from "../database/Schema";
import { say } from "../lib/funclib";
import PracticerInput from "../components/PracticerInput";
import DefinitionGraph from "../components/DefinitionGraph";
import {
  CardType,
  CharacterType,
  DefinitionType,
  RepetrobesActivityConfigType,
} from "../lib/types";
import Loader from "../img/loader.gif";
import { ReactElement } from "react";

const CentredFlex = styled.div`
  display: flex;
  justify-content: center;
`;

const QuestionWrapper = styled.div`
  display: block;
  justify-content: center;
`;
const AnswerWrapper = styled.div`
  display: flex;
  justify-content: center;
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
  display: flex;
  justify-content: center;
  font-size: 2em;
  padding: 1em;
`;

const MeaningWrapper = styled.div`
  display: block;
  padding: 0.5em;
`;

interface MeaningProps {
  definition: DefinitionType;
  showSynonyms: boolean;
}

function Meaning({ definition, showSynonyms }: MeaningProps) {
  const posTrans = [];
  for (const provider of definition.providerTranslations) {
    if (provider.posTranslations.length > 0) {
      for (const posTranslation of provider.posTranslations) {
        posTrans.push(
          <div key={"mean" + posTranslation.posTag}>
            {posTranslation.posTag}: {posTranslation.values.join(", ")}
          </div>,
        );
      }
      break;
    }
  }
  const synonyms = [];
  if (showSynonyms) {
    for (const posSynonym of definition.synonyms) {
      if (posSynonym.values.length > 0) {
        synonyms.push(
          <div key={"syn" + posSynonym.posTag}>
            {posSynonym.posTag}: {posSynonym.values.join(", ")}
          </div>,
        );
      }
    }
  }
  return <>{posTrans.concat(synonyms)}</>;
}

interface GraphQuestionProps {
  card: CardType;
  characters: CharacterType[];
}

function GraphQuestion({ card, characters }: GraphQuestionProps) {
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

function SoundQuestion({ card, definition, characters, showAnswer }: SoundQuestionProps) {
  return (
    <GraphSoundQuestionStyle>
      <div className="row" style={{ justifyContent: "center", alignItems: "center" }}>
        <div>{card && card.front ? card.front : definition.sound}</div>
        <div>
          <button
            type="button"
            onClick={() => say(definition.graph)}
            className="btn btn-primary btn-user btn-block"
            style={{ marginLeft: "2em" }}
          >
            Say it!
          </button>
        </div>
      </div>
      <div className="row" style={{ justifyContent: "center", alignItems: "center" }}>
        <DefinitionGraph characters={characters} showAnswer={showAnswer}></DefinitionGraph>
      </div>
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
}

function MeaningQuestion({
  card,
  definition,
  showSynonyms,
  showL2LengthHint,
  characters,
  showAnswer,
}: MeaningQuestionProps) {
  return (
    <>
      <div className="row" style={{ justifyContent: "center", alignItems: "center" }}>
        <StyledQuestion>
          {" "}
          {card && card.front ? (
            card.front
          ) : (
            <MeaningWrapper>
              <Meaning showSynonyms={showSynonyms} definition={definition} />
              {showL2LengthHint && <div key="lenHint">(L2 length: {definition.graph.length})</div>}
            </MeaningWrapper>
          )}
        </StyledQuestion>
      </div>
      <div className="row" style={{ justifyContent: "center", alignItems: "center" }}>
        <DefinitionGraph characters={characters} showAnswer={showAnswer}></DefinitionGraph>
      </div>
    </>
  );
}

interface SoundGraphAnswerProps {
  card: CardType;
  definition: DefinitionType;
  showSynonyms: boolean;
}

function GraphAnswer({ card, definition, showSynonyms }: SoundGraphAnswerProps) {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center" }}>
            <StyledAnswer> {definition.sound} </StyledAnswer>
            <button
              type="button"
              onClick={() => say(definition.graph)}
              className="btn btn-primary btn-user btn-block"
              style={{ marginLeft: "2em" }}
            >
              Say it!
            </button>
          </div>
          <MeaningWrapper>
            <Meaning showSynonyms={showSynonyms} definition={definition} />
          </MeaningWrapper>
        </>
      )}
    </div>
  );
}

function SoundAnswer({ card, definition, showSynonyms }: SoundGraphAnswerProps) {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <MeaningWrapper>
          <Meaning showSynonyms={showSynonyms} definition={definition} />
        </MeaningWrapper>
      )}
    </div>
  );
}

interface MeaningAnswerProps {
  card: CardType;
  definition: DefinitionType;
}

function MeaningAnswer({ card, definition }: MeaningAnswerProps) {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <div style={{ display: "flex", alignItems: "center" }}>
          <StyledAnswer> {definition.sound} </StyledAnswer>
          <button
            type="button"
            onClick={() => say(definition.graph)}
            className="btn btn-primary btn-user btn-block"
            style={{ marginLeft: "2em" }}
          >
            Say it!
          </button>
        </div>
      )}
    </div>
  );
}

function getAnswer(card: CardType, definition: DefinitionType, showSynonyms: boolean) {
  const cardType = card.id.split(CARD_ID_SEPARATOR)[1];
  switch (cardType) {
    case CARD_TYPES.GRAPH.toString():
      return <GraphAnswer card={card} definition={definition} showSynonyms={showSynonyms} />;
    case CARD_TYPES.SOUND.toString():
      return <SoundAnswer card={card} definition={definition} showSynonyms={showSynonyms} />;
    case CARD_TYPES.MEANING.toString():
      return <MeaningAnswer card={card} definition={definition} />;
  }
}

function getQuestion(
  card: CardType,
  definition: DefinitionType,
  characters: CharacterType[],
  showSynonyms: boolean,
  showL2LengthHint: boolean,
  showAnswer: boolean,
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
        />
      );
  }
}

interface Props {
  onPractice: (wordId: string, grade: number) => void;
  showAnswer: boolean;
  currentCard: CardType | null;
  definition: DefinitionType | null;
  characters: CharacterType[] | null;
  loading: boolean;
  activityConfig: RepetrobesActivityConfigType;
  onShowAnswer: () => void;
}

export function VocabRevisor({
  showAnswer,
  currentCard,
  definition,
  characters,
  loading,
  activityConfig,
  onPractice,
  onShowAnswer,
}: Props): ReactElement {
  function handlePractice(wordId: string, grade: number) {
    onPractice(wordId, grade);
  }

  const { showSynonyms, showL2LengthHint } = activityConfig;
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
            )}
          </QuestionWrapper>
          {!showAnswer && (
            <CentredFlex>
              <button
                style={{ marginTop: "1em" }}
                className="btn btn-large btn-primary"
                onClick={onShowAnswer}
              >
                Show Answer
              </button>
            </CentredFlex>
          )}
          {showAnswer && (
            <>
              <AnswerWrapper>{getAnswer(currentCard, definition, showSynonyms)}</AnswerWrapper>
              <PracticerInput wordId={wordId(currentCard)} onPractice={handlePractice} />
            </>
          )}
        </>
      )}
    </>
  );
}

export default VocabRevisor;
