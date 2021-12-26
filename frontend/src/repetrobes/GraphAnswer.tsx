import { CentredFlex, MeaningWrapper, CommonAnswerProps, StyledAnswer } from "./Common";
import { ReactElement } from "react";
import { Button } from "@material-ui/core";
import Meaning from "../components/Meaning";
import RecentSentencesElement from "../components/RecentSentencesElement";
import { say } from "../lib/funclib";

export default function GraphAnswer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  onCardFrontUpdate,
}: CommonAnswerProps): ReactElement {
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
          <MeaningWrapper>
            <Meaning
              editable={false}
              showSynonyms={showSynonyms}
              definition={definition}
              card={card}
              onCardFrontUpdate={onCardFrontUpdate}
            />
          </MeaningWrapper>
          {showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}
        </>
      )}
    </div>
  );
}
