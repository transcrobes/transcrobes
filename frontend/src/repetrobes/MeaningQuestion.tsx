import { ReactElement } from "react";
import DefinitionGraph from "../components/DefinitionGraph";
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
