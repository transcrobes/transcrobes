import { styled, Typography } from "@mui/material";
import { ReactElement } from "react";
import DefinitionGraph from "../components/DefinitionGraph";
import DiscoverableWord from "../components/DiscoverableWord";
import useWindowDimensions from "../hooks/WindowDimensions";
import { CardType, CharacterType, DefinitionType, PosSentences } from "../lib/types";

interface QuestionDefinitionGraphProps {
  characters: (CharacterType | null)[];
  showAnswer: boolean;
  word?: string;
}

export default function QuestionDefinitionGraph({
  characters,
  showAnswer,
  word,
}: QuestionDefinitionGraphProps): ReactElement {
  const dimensions = useWindowDimensions();
  // the min char size should allow 4 on an old iphone before scrollbars appear
  const newDim = Math.max(72, Math.min(150, dimensions.width / characters.length - 18));
  return (
    <>
      {showAnswer && word && (
        <DiscoverableWord graph={word} newTab>
          <Typography sx={{ fontFamily: "notaserifextralight", textAlign: "center", fontSize: newDim * 0.75 }}>
            {word}
          </Typography>
        </DiscoverableWord>
      )}
      <DefinitionGraph
        title="Remember the word and draw it here with a mouse or touchscreen, or even better use a pen and paper!"
        characters={characters}
        showAnswer={showAnswer}
        charHeight={newDim}
        charWidth={newDim}
        newTab
      />
    </>
  );
}
export const CentredFlex = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0.2em",
}));

export const GraphSoundQuestionStyle = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
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
  [theme.breakpoints.down("md")]: {
    padding: "0.3em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
}));

export const StyledQuestion = styled("div")(({ theme }) => ({
  fontSize: "2em",
  [theme.breakpoints.down("md")]: {
    padding: "0.3em",
  },
  [theme.breakpoints.up("sm")]: {
    padding: "1em",
  },
}));

export const MeaningWrapper = styled("div")(({ theme }) => ({
  display: "block",
  [theme.breakpoints.down("md")]: {
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
  showNormalFont?: boolean;
  translationProviderOrder: Record<string, number>;
  onCardFrontUpdate: (card: CardType) => void;
}

const RANDOM_NEXT_WINDOW = 10;

export function getRandomNext(candidates: CardType[], nextWindowSize: number = RANDOM_NEXT_WINDOW): CardType {
  const shortList = candidates.slice(0, nextWindowSize);
  return shortList[Math.floor(Math.random() * Math.floor(shortList.length))];
}
