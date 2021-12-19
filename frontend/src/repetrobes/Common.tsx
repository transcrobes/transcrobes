import { styled } from "@material-ui/core";
import { CardType, DefinitionType, PosSentences } from "../lib/types";

export const CentredFlex = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0.2em",
}));

export const QuestionWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  [theme.breakpoints.down("sm")]: {
    padding: "0.3em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
}));

export const AnswerWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  [theme.breakpoints.down("sm")]: {
    padding: "0.3em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
}));

export const GraphSoundQuestionStyle = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    fontSize: "3em",
    padding: "0.1em",
  },
  [theme.breakpoints.up("sm")]: {
    fontSize: "4em",
    padding: "0.5em",
  },
}));

export const StyledAnswer = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "2em",
  [theme.breakpoints.down("sm")]: {
    padding: "0.3em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
}));

export const StyledQuestion = styled("div")(({ theme }) => ({
  fontSize: "2em",
  [theme.breakpoints.down("sm")]: {
    padding: "0.3em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
}));

export const MeaningWrapper = styled("div")(({ theme }) => ({
  display: "block",
  [theme.breakpoints.down("sm")]: {
    padding: "0.2em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
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
