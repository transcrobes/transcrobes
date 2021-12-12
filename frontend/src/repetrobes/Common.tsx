import styled from "styled-components";
import { CardType, DefinitionType, PosSentences } from "../lib/types";

export const CentredFlex = styled.div`
  display: flex;
  justify-content: center;
  padding: 0.2em;
`;
export const QuestionWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1em;
`;
export const AnswerWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1em;
`;
export const GraphSoundQuestionStyle = styled.div`
  font-size: 4em;
  padding: 0.5em;
`;
export const StyledAnswer = styled.div`
  display: flex;
  justify-content: center;
  font-size: 2em;
  padding: 1em;
`;
export const StyledQuestion = styled.div`
  font-size: 2em;
  padding: 1em;
`;
export const MeaningWrapper = styled.div`
  display: block;
  padding: 1em;
`;

export interface CommonAnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showRecents: boolean;
  onCardFrontUpdate: (card: CardType) => void;
}
