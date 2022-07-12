import { ReactElement } from "react";
import QuestionDefinitionGraph from "./Common";
import { CardType, CharacterType } from "../lib/types";
import { GraphSoundQuestionStyle } from "./Common";

interface GraphQuestionProps {
  card: CardType;
  characters: CharacterType[];
  word?: string;
}

export default function GraphQuestion({ card, characters, word }: GraphQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      {card && card.front ? (
        card.front
      ) : (
        <QuestionDefinitionGraph word={word} characters={characters} showAnswer={true} />
      )}
    </GraphSoundQuestionStyle>
  );
}
