import { styled } from "@mui/material";
import { WithStylesProps } from "react-jss";
import { hslToHex } from "../lib/funclib";
import { LanguagedReaderState, ReaderState, SEGMENTED_BASE_PADDING, UNSURE_ATTRIBUTE } from "../lib/types";
import CheckIcon from "@mui/icons-material/Check";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import { GRADE } from "../database/Schema";
import { GradesType } from "../lib/types";

export const DEFAULT_FONT_COLOUR = { h: 0, s: 0, l: 0 };
export const DEFAULT_GLOSS_BACKGROUND_COLOUR = { h: 0, s: 0, l: 93 };

export const InfoBox = styled("div")(() => ({
  margin: "0.7em",
}));

export const ThinHR = styled("hr")(() => ({
  margin: "0.7em",
}));

export const Conftainer = styled("div")(() => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "0.3em",
  width: "100%",
}));

export const ETFStyles = {
  entry: {
    flexDirection: (props: ReaderState) => props.glossPosition,
    alignItems: "center",
    display: "inline-flex",
    position: "relative",
    // cursor: (props: ReaderState) => (props.clickable ? "pointer" : "auto"),
    cursor: "pointer",
    textIndent: 0,
    paddingLeft: (props: LanguagedReaderState) =>
      props.scriptioContinuo && props.segmentation ? (SEGMENTED_BASE_PADDING * props.fontSize * 100) / 100 + "px" : "",
  },
  word: {
    color: (props: ReaderState) => (props.fontColour ? [hslToHex(props.fontColour), "!important"] : "inherit"),
    fontFamily: (props: ReaderState) => props.fontFamilyMain || "inherit",
    fontSize: (props: ReaderState) => `${props.fontSize * 100}%`,
  },
  gloss: {
    [`&[${UNSURE_ATTRIBUTE}]`]: {
      backgroundColor: (props: ReaderState) =>
        props.glossUnsureBackgroundColour ? [hslToHex(props.glossUnsureBackgroundColour), "!important"] : "inherit",
    },
    color: (props: ReaderState) =>
      props.glossFontColour ? [hslToHex(props.glossFontColour), "!important"] : "inherit",
    fontFamily: (props: ReaderState) =>
      props.fontFamilyGloss && props.fontFamilyGloss !== "Original" ? props.fontFamilyGloss : "inherit",
    fontSize: (props: ReaderState) => `${props.glossFontSize * props.fontSize * 100}%`,
    verticalAlign: (props: ReaderState) => `${(100 - props.glossFontSize * 100) / 2}%`,
  },
};
export type ETFStylesType = typeof ETFStyles;

export interface ETFStylesProps extends WithStylesProps<ETFStylesType> {
  children: React.ReactNode;
}

const hard = { id: GRADE.HARD.toString(), content: "widgets.grades.hard", icon: <SentimentSatisfiedIcon /> };
const unknown = {
  id: GRADE.UNKNOWN.toString(),
  content: "widgets.grades.unknown",
  icon: <SentimentVeryDissatisfiedIcon />,
};
const good = { id: GRADE.GOOD.toString(), content: "widgets.grades.good", icon: <SentimentVerySatisfiedIcon /> };
const known = { id: GRADE.KNOWN.toString(), content: "widgets.grades.known", icon: <CheckIcon /> };
// const hard = { id: GRADE.HARD.toString(), content: "Add as known (poorly)", icon: <SentimentSatisfiedIcon /> };
// const unknown = { id: GRADE.UNKNOWN.toString(), content: "Plan to learn", icon: <SentimentVeryDissatisfiedIcon /> };
// const good = { id: GRADE.GOOD.toString(), content: "Add as known", icon: <SentimentVerySatisfiedIcon /> };
// const known = { id: GRADE.KNOWN.toString(), content: "Add as known (no revision)", icon: <CheckIcon /> };

export const GRADES: GradesType[] = [hard, unknown, good, known];
export const BASIC_GRADES: GradesType[] = [good, unknown];
