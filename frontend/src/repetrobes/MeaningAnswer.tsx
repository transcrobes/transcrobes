import { Button } from "@material-ui/core";
import { ReactElement } from "react";
import RecentSentencesElement from "../components/RecentSentencesElement";
import { say } from "../lib/funclib";
import { CardType, DefinitionType, PosSentences } from "../lib/types";
import { CentredFlex, StyledAnswer } from "./Common";

interface MeaningAnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showRecents: boolean;
}

export default function MeaningAnswer({
  card,
  definition,
  recentSentences,
  showRecents,
}: MeaningAnswerProps): ReactElement {
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <CentredFlex>
            <StyledAnswer> {definition.sound} </StyledAnswer>
            <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
              Say it!
            </Button>
          </CentredFlex>
          <CentredFlex>
            {showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}
          </CentredFlex>
        </>
      )}
    </div>
  );
}
