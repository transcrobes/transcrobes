import { ReactElement } from "react";
import Meaning from "../components/Meaning";
import { CardType, CharacterType, DefinitionType } from "../lib/types";
import QuestionDefinitionGraph, { MeaningWrapper, StyledQuestion } from "./Common";

interface MeaningQuestionProps {
  card: CardType;
  definition: DefinitionType;
  showSynonyms: boolean;
  showL2LengthHint: boolean;
  characters: CharacterType[];
  showAnswer: boolean;
  word?: DefinitionType;
  translationProviderOrder: Record<string, number>;
  onCardFrontUpdate: (card: CardType) => void;
}

export default function MeaningQuestion({
  card,
  definition,
  showSynonyms,
  showL2LengthHint,
  characters,
  showAnswer,
  word,
  translationProviderOrder,
  onCardFrontUpdate,
}: MeaningQuestionProps): ReactElement {
  return (
    <div>
      <StyledQuestion>
        <MeaningWrapper>
          <Meaning
            translationProviderOrder={translationProviderOrder}
            editable={true}
            showSynonyms={showSynonyms}
            definition={definition}
            card={card}
            onCardFrontUpdate={onCardFrontUpdate}
          />
          {showL2LengthHint && <div key="lenHint">(L2 length: {definition.graph.length})</div>}
        </MeaningWrapper>
      </StyledQuestion>
      <QuestionDefinitionGraph
        word={word}
        characters={characters}
        showAnswer={showAnswer}
        showDiscoverableWord={showAnswer}
        showToneColours={showAnswer}
      />
    </div>
  );
}
