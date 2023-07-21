import { ReactElement } from "react";
import { CardType, CharacterType, DefinitionType } from "../lib/types";
import QuestionDefinitionGraph, { GraphSoundQuestionStyle } from "./Common";

interface GraphQuestionProps {
  card: CardType;
  characters: (CharacterType | null)[];
  showAnswer: boolean;
  showDiscoverableWord: boolean;
  word?: DefinitionType;
}

export default function GraphQuestion({
  card,
  characters,
  word,
  showAnswer,
  showDiscoverableWord,
}: GraphQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      {card && card.front ? (
        card.front
      ) : (
        <QuestionDefinitionGraph
          word={word}
          characters={characters}
          showDiscoverableWord={showDiscoverableWord}
          showToneColours={showAnswer}
          showAnswer
        />
      )}
    </GraphSoundQuestionStyle>
  );
}
