import styled from "styled-components";
import { ReactElement } from "react";
import { Button } from "@material-ui/core";

import SearchLoading from "../components/SearchLoading";
import { CARD_ID_SEPARATOR, CARD_TYPES, getWordId } from "../database/Schema";
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
import Meaning from "../components/Meaning";

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

function SoundQuestion({ card, definition, characters, showAnswer }: SoundQuestionProps) {
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
}: MeaningQuestionProps) {
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
  showSynonyms: boolean;
  onCardFrontUpdate: (card: CardType) => void;
}

function GraphAnswer({ card, definition, showSynonyms, onCardFrontUpdate }: SoundGraphAnswerProps) {
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
        </>
      )}
    </div>
  );
}

function SoundAnswer({ card, definition, showSynonyms, onCardFrontUpdate }: SoundGraphAnswerProps) {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <MeaningWrapper>
          <Meaning
            showSynonyms={showSynonyms}
            definition={definition}
            card={card}
            onCardFrontUpdate={onCardFrontUpdate}
          />
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
        <CentredFlex>
          <StyledAnswer> {definition.sound} </StyledAnswer>
          <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
            Say it!
          </Button>
        </CentredFlex>
      )}
    </div>
  );
}

function getAnswer(
  card: CardType,
  definition: DefinitionType,
  showSynonyms: boolean,
  onCardFrontUpdate: (card: CardType) => void,
) {
  const cardType = card.id.split(CARD_ID_SEPARATOR)[1];
  switch (cardType) {
    case CARD_TYPES.GRAPH.toString():
      return (
        <GraphAnswer
          card={card}
          definition={definition}
          showSynonyms={showSynonyms}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      );
    case CARD_TYPES.SOUND.toString():
      return (
        <SoundAnswer
          card={card}
          definition={definition}
          showSynonyms={showSynonyms}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      );
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
  onCardFrontUpdate,
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
                {getAnswer(currentCard, definition, showSynonyms, onCardFrontUpdate)}
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
