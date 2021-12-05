import * as React from "react";
import { MouseoverType, SegmentationType } from "../../lib/types";
import ToggleButton from "./ToggleButton";
import ToggleGroup from "./ToggleGroup";

export type GlossingSettingsProps = {
  glossing: string;
  setGlossing: (glossing: string) => void;
  segmentation: string;
  setSegmentation: (segmentation: SegmentationType) => void;
  mouseover: string;
  setMouseover: (mouseover: MouseoverType) => void;
};

export default function GlossingSettings(props: GlossingSettingsProps): React.ReactElement {
  const { glossing, setGlossing, segmentation, setSegmentation, mouseover, setMouseover } = props;

  // FIXME: for some incomprehensible (or rather, web-developer-comprehensible) reason,
  // trying to use a .toString() on the enum of glossing values causes an exception. WTF indeed...
  // NO_GLOSS: 2, // segmented
  // L2_SIMPLIFIED: 4, // e.g, using "simple" Chinese characters
  // TRANSLITERATION: 6, // e.g, pinyin
  // L1: 8, // e.g, English
  // TRANSLITERATION_L1: 9, // e.g, Pinyin+English

  return (
    <>
      <ToggleGroup value={glossing} label="Glossing" onChange={setGlossing}>
        <ToggleButton value="2" label="None">
          None
        </ToggleButton>
        <ToggleButton value="4" label="L2 simplified">
          Simpler
        </ToggleButton>
        <ToggleButton value="6" label="Sounds">
          Sounds
        </ToggleButton>
        <ToggleButton value="8" label="L1">
          English
        </ToggleButton>
        <ToggleButton value="9" label="Sounds + L1">
          Sounds + English
        </ToggleButton>
      </ToggleGroup>
      <ToggleGroup value={segmentation} label="Set segmentation" onChange={setSegmentation}>
        <ToggleButton value="none" label="None">
          None
        </ToggleButton>
        <ToggleButton value="segmented" label="Segmented">
          Segmented
        </ToggleButton>
      </ToggleGroup>
      <ToggleGroup value={mouseover} label="Set mouseover" onChange={setMouseover}>
        <ToggleButton value="none" label="None">
          None
        </ToggleButton>
        <ToggleButton value="mouseover" label="Display mouseover">
          Display Mouseover
        </ToggleButton>
      </ToggleGroup>
    </>
  );
}
