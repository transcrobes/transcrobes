import { Button } from "@material-ui/core";
import { ReactElement } from "react";
import DefinitionGraph from "../components/DefinitionGraph";
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
      <DefinitionGraph characters={characters} showAnswer={showAnswer}></DefinitionGraph>
    </GraphSoundQuestionStyle>
  );
}
