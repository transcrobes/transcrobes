import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
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
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <CentredFlex>
            <StyledAnswer> {definition.sound} </StyledAnswer>
            <SayIt graph={definition.graph} lang={fromLang} />
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
