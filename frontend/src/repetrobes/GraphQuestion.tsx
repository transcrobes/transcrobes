import { ReactElement } from "react";
import DefinitionGraph from "../components/DefinitionGraph";
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
        <DefinitionGraph characters={characters} showAnswer={true}></DefinitionGraph>
      )}{" "}
    </GraphSoundQuestionStyle>
  );
}
