import { styled } from "@material-ui/core";
import { CardType, DefinitionType, PosSentences } from "../lib/types";

export const CentredFlex = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  padding: "0.2em",
}));

export const QuestionWrapper = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  padding: "1em",
}));

export const AnswerWrapper = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  padding: "1em",
}));

export const GraphSoundQuestionStyle = styled("div")(() => ({
  fontSize: "4em",
  padding: "0.5em",
}));

export const StyledAnswer = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  fontSize: "2em",
  padding: "1em",
}));

export const StyledQuestion = styled("div")(() => ({
  fontSize: "2em",
  padding: "1em",
}));

export const MeaningWrapper = styled("div")(() => ({
  display: "block",
  padding: "1em",
}));

export const LauncherStyle = styled("div")(() => ({
  display: "flex",
  justifyContent: "space-between",
  padding: "0.5em",
}));

export interface CommonAnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showRecents: boolean;
  onCardFrontUpdate: (card: CardType) => void;
}

const RANDOM_NEXT_WINDOW = 10;

export function getRandomNext(
  candidates: CardType[],
  nextWindowSize: number = RANDOM_NEXT_WINDOW,
): CardType {
  const shortList = candidates.slice(0, nextWindowSize);
  return shortList[Math.floor(Math.random() * Math.floor(shortList.length))];
}
