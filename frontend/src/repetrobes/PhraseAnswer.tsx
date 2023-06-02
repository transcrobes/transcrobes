import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import Meaning from "../components/Meaning";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
import Sound from "../components/Sound";
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
        <StyledAnswer>
          <Sound definition={definition} fromLang={fromLang} />
          <SayIt graph={definition.graph} lang={fromLang} />
        </StyledAnswer>
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
