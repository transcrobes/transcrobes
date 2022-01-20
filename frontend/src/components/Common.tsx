import { styled } from "@material-ui/core";
import { WithStylesProps } from "react-jss";
import { hslToHex } from "../lib/funclib";
import { ReaderState, SEGMENTED_BASE_PADDING } from "../lib/types";

export const DEFAULT_FONT_COLOUR = { h: 0, s: 0, l: 0 };

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
    cursor: (props: ReaderState) => (props.clickable ? "pointer" : "auto"),
    textIndent: 0,
    paddingLeft: (props: ReaderState) =>
      props.segmentation ? (SEGMENTED_BASE_PADDING * props.fontSize * 100) / 100 + "px" : "",
  },
  word: {
    color: (props: ReaderState) => (props.fontColour ? [hslToHex(props.fontColour), "!important"] : "inherit"),
    fontFamily: (props: ReaderState) => props.fontFamilyChinese || "inherit",
    fontSize: (props: ReaderState) => `${props.fontSize * 100}%`,
  },
  gloss: {
    color: (props: ReaderState) =>
      props.glossFontColour ? [hslToHex(props.glossFontColour), "!important"] : "inherit",
    fontFamily: (props: ReaderState) =>
      props.fontFamily && props.fontFamily !== "Original" ? props.fontFamily : "inherit",
    fontSize: (props: ReaderState) => `${props.glossFontSize * props.fontSize * 100}%`,
    verticalAlign: (props: ReaderState) => `${(100 - props.glossFontSize * 100) / 2}%`,
  },
};
export type ETFStylesType = typeof ETFStyles;

export interface ETFStylesProps extends WithStylesProps<ETFStylesType> {
  children: React.ReactNode;
}
