import { HslColor } from "react-colorful";
import { GlossPosition } from "../../lib/types";

// "above" ?
export type SubPosition = "top" | "bottom" | "under";

export type VideoConfig = {
  volume: number;
  playbackRate: number;
  subPlaybackRate: number;
  played: number;
  subDelay: number;
  subFontSize: number;
  subFontColour: HslColor;
  glossFontColour: HslColor;
  glossFontSize: number;
  glossPosition: GlossPosition;
  subBoxWidth: number;
  subPosition: SubPosition;
  segmentation: boolean;
  mouseover: boolean;
  glossing: number;
};

export type VideoContentConfig = {
  id: string;
  config?: VideoConfig;
};
