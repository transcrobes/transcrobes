import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
import Sound from "../components/Sound";
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
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  return (
    <div>
      {card && card.back ? (
        card.back
      ) : (
        <>
          <CentredFlex>
            <StyledAnswer>
              <Sound definition={definition} fromLang={fromLang} />
              <SayIt graph={definition.graph} lang={fromLang} />
            </StyledAnswer>
          </CentredFlex>
          <CentredFlex>{showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}</CentredFlex>
        </>
      )}
    </div>
  );
}
