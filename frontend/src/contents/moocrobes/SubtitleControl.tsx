import { ReactElement } from "react";
import { HslColor } from "react-colorful";

interface Props {
  currentCue: string;
  subBoxWidth: number;
  subFontColour: HslColor;
  subFontSize: number;
  classes: any;
}

function hslToHex({ h, s, l }: HslColor) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0"); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
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
