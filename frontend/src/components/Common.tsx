import { styled } from "@material-ui/core";

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
