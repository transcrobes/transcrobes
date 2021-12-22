import { ReactElement } from "react";
import QuestionDefinitionGraph from "./Common";
import { CardType, CharacterType } from "../lib/types";
import { GraphSoundQuestionStyle } from "./Common";

interface GraphQuestionProps {
  card: CardType;
  characters: CharacterType[];
}

export default function GraphQuestion({ card, characters }: GraphQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      {" "}
      {card && card.front ? (
        card.front
      ) : (
        <QuestionDefinitionGraph characters={characters} showAnswer={true} />
      )}{" "}
    </GraphSoundQuestionStyle>
  );
}
