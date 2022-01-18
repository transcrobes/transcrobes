import { ReactElement } from "react";
import { HslColor } from "react-colorful";
import { hslToHex } from "../../lib/funclib";

interface Props {
  currentCue: string;
  subBoxWidth: number;
  subFontColour: HslColor;
  subFontSize: number;
  classes: any;
}

function SubtitleControl({
  currentCue,
  subBoxWidth,
  subFontColour,
  subFontSize,
}: Props): ReactElement {
  return (
    <>
      <div
        dangerouslySetInnerHTML={{ __html: currentCue }}
        style={{
          color: hslToHex(subFontColour),
          maxWidth: `${(subBoxWidth || 1) * 100}%`,
          fontSize: `${(subFontSize || 1) * 100}%`,
        }}
      ></div>
    </>
  );
}

export default SubtitleControl;
