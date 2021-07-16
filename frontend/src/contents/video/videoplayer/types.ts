import { Color } from "material-ui-color";

// "above" ?
export type SubPosition = "top" | "bottom" | "under";

export type VideoConfig = {
  volume: number;
  playbackRate: number;
  played: number;
  subDelay: number;
  subFontSize: number;
  subFontColour: Color;
  subBoxWidth: number;
  subPosition: SubPosition;
};

export type VideoContentConfig = {
  id: string;
  config?: VideoConfig;
};
