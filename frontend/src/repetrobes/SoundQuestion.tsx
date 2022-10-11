import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import SayIt from "../components/SayIt";
import { CardType, CharacterType, DefinitionType } from "../lib/types";
import QuestionDefinitionGraph, { CentredFlex, GraphSoundQuestionStyle } from "./Common";

interface SoundQuestionProps {
  card: CardType;
  definition: DefinitionType;
  characters: CharacterType[];
  showAnswer: boolean;
  word?: string;
}

export default function SoundQuestion({
  card,
  definition,
  characters,
  showAnswer,
  word,
}: SoundQuestionProps): ReactElement {
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <GraphSoundQuestionStyle>
      <CentredFlex>{card && card.front ? card.front : definition.sound}</CentredFlex>
      <CentredFlex>
        <SayIt graph={definition.graph} lang={fromLang} />
      </CentredFlex>
      <QuestionDefinitionGraph word={word} characters={characters} showAnswer={showAnswer} />
    </GraphSoundQuestionStyle>
  );
}
