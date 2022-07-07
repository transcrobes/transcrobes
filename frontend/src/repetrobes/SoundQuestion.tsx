import { ReactElement } from "react";
import SayIt from "../components/SayIt";
import { CardType, CharacterType, DefinitionType } from "../lib/types";
import QuestionDefinitionGraph, { CentredFlex, GraphSoundQuestionStyle } from "./Common";

interface SoundQuestionProps {
  card: CardType;
  definition: DefinitionType;
  characters: CharacterType[];
  showAnswer: boolean;
}

export default function SoundQuestion({ card, definition, characters, showAnswer }: SoundQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      <CentredFlex>{card && card.front ? card.front : definition.sound}</CentredFlex>
      <CentredFlex>
        <SayIt graph={definition.graph} />
      </CentredFlex>
      <QuestionDefinitionGraph characters={characters} showAnswer={showAnswer} />
    </GraphSoundQuestionStyle>
  );
}
