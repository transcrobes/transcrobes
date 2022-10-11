import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
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
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <div>
      <CentredFlex>
        <StyledAnswer> {definition.sound} </StyledAnswer>
      </CentredFlex>
      <CentredFlex>
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
    </div>
  );
}
