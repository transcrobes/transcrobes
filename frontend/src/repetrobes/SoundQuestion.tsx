import { Button } from "@mui/material";
import { ReactElement } from "react";
import QuestionDefinitionGraph from "./Common";
import { say } from "../lib/funclib";
import { CardType, CharacterType, DefinitionType } from "../lib/types";
import { CentredFlex, GraphSoundQuestionStyle } from "./Common";

interface SoundQuestionProps {
  card: CardType;
  definition: DefinitionType;
  characters: CharacterType[];
  showAnswer: boolean;
}

export default function SoundQuestion({
  card,
  definition,
  characters,
  showAnswer,
}: SoundQuestionProps): ReactElement {
  return (
    <GraphSoundQuestionStyle>
      <CentredFlex>{card && card.front ? card.front : definition.sound}</CentredFlex>
      <CentredFlex>
        <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
          Say it!
        </Button>
      </CentredFlex>
      <QuestionDefinitionGraph characters={characters} showAnswer={showAnswer} />
    </GraphSoundQuestionStyle>
  );
}
