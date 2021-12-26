import { ReactElement } from "react";
import QuestionDefinitionGraph from "./Common";
import Meaning from "../components/Meaning";
import { CardType, CharacterType, DefinitionType } from "../lib/types";
import { MeaningWrapper, StyledQuestion } from "./Common";

interface MeaningQuestionProps {
  card: CardType;
  definition: DefinitionType;
  showSynonyms: boolean;
  showL2LengthHint: boolean;
  characters: CharacterType[];
  showAnswer: boolean;
  onCardFrontUpdate: (card: CardType) => void;
}

export default function MeaningQuestion({
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
            editable={true}
            showSynonyms={showSynonyms}
            definition={definition}
            card={card}
            onCardFrontUpdate={onCardFrontUpdate}
          />
          {showL2LengthHint && <div key="lenHint">(L2 length: {definition.graph.length})</div>}
        </MeaningWrapper>
      </StyledQuestion>
      <QuestionDefinitionGraph characters={characters} showAnswer={showAnswer} />
    </div>
  );
}
