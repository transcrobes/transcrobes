import { Button } from "@material-ui/core";
import { ReactElement } from "react";
import Meaning from "../components/Meaning";
import RecentSentencesElement from "../components/RecentSentencesElement";
import { say } from "../lib/funclib";
import { CentredFlex, CommonAnswerProps, MeaningWrapper, StyledAnswer } from "./Common";

export default function PhraseAnswer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  translationProviderOrder,
  onCardFrontUpdate,
}: CommonAnswerProps): ReactElement {
  return (
    <div>
      <CentredFlex>
        <StyledAnswer> {definition.sound} </StyledAnswer>
      </CentredFlex>
      <CentredFlex>
        <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
          Say it!
        </Button>
      </CentredFlex>
      <MeaningWrapper>
        <Meaning
          translationProviderOrder={translationProviderOrder}
          editable={false}
          showSynonyms={showSynonyms}
          definition={definition}
          card={card}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      </MeaningWrapper>
      {showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}
    </div>
  );
}
