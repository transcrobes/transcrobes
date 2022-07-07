import { ReactElement } from "react";
import Meaning from "../components/Meaning";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
import { CentredFlex, CommonAnswerProps, MeaningWrapper, StyledAnswer } from "./Common";

export default function GraphAnswer({
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
      {card && card.back ? (
        card.back
      ) : (
        <>
          <CentredFlex>
            <StyledAnswer> {definition.sound} </StyledAnswer>
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
        </>
      )}
    </div>
  );
}
