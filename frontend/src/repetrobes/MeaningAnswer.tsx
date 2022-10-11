import { ReactElement } from "react";
import { useAppSelector } from "../app/hooks";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
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
            <StyledAnswer> {definition.sound} </StyledAnswer>
            <SayIt graph={definition.graph} lang={fromLang} />
          </CentredFlex>
          <CentredFlex>{showRecents && <RecentSentencesElement recentPosSentences={recentSentences} />}</CentredFlex>
        </>
      )}
    </div>
  );
}
