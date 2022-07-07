import { ReactElement } from "react";
import Meaning from "../components/Meaning";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
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
        <SayIt graph={definition.graph} />
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
