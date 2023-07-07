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

const textShadow = ({ fontTextShadow }: ReaderState) =>
  fontTextShadow !== "none"
    ? `-1px -1px 0 ${fontTextShadow}, 1px -1px 0 ${fontTextShadow}, -1px 1px 0 ${fontTextShadow},
      1px 1px 0 ${fontTextShadow}, -2px 0 0 ${fontTextShadow}, 2px 0 0 ${fontTextShadow}, 0 2px 0 ${fontTextShadow},
      0 -2px 0 ${fontTextShadow}`
    : undefined;

const fontStuff = {
  fontFamily: ({ fontFamilyMain }: ReaderState) =>
    fontFamilyMain && fontFamilyMain !== "Original" ? fontFamilyMain : "inherit",
  fontSize: ({ fontSize }: ReaderState) => `${fontSize * 100}%`,
  textShadow,
};

export const ETFStyles = {
  entry: {
    flexDirection: ({ glossPosition }: ReaderState) => glossPosition,
    alignItems: "center",
    display: "inline-flex",
    position: "relative",
    // cursor: ({ clickable }: ReaderState) => (clickable ? "pointer" : "auto"),
    cursor: "pointer",
    textIndent: 0,
    paddingLeft: (props: LanguagedReaderState) =>
      props.scriptioContinuo && props.segmentation ? (SEGMENTED_BASE_PADDING * props.fontSize * 100) / 100 + "px" : "",
  },
  word: {
    ...fontStuff,
    color: ({ fontColour }: ReaderState) =>
      fontColour && fontColour !== "tones" ? [hslToHex(fontColour), "!important"] : "inherit",
  },
  wordPinyinColours: fontStuff,
  gloss: {
    [`&[${UNSURE_ATTRIBUTE}]`]: {
      backgroundColor: ({ glossUnsureBackgroundColour }: ReaderState) =>
        glossUnsureBackgroundColour ? [hslToHex(glossUnsureBackgroundColour), "!important"] : "inherit",
    },
    color: ({ glossFontColour }: ReaderState) =>
      glossFontColour ? [hslToHex(glossFontColour), "!important"] : "inherit",
    fontFamily: ({ fontFamilyGloss }: ReaderState) =>
      fontFamilyGloss && fontFamilyGloss !== "Original" ? fontFamilyGloss : "inherit",
    fontSize: ({ glossFontSize, fontSize }: ReaderState) => `${glossFontSize * fontSize * 100}%`,
    verticalAlign: ({ glossFontSize }: ReaderState) => `${(100 - glossFontSize * 100) / 2}%`,
    textShadow,
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
export const GRADES: GradesType[] = [hard, unknown, good, known];
export const BASIC_GRADES: GradesType[] = [good, unknown];
