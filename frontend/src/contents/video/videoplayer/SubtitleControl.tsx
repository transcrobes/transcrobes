import { ReactElement } from "react";

interface Props {
  currentCue: string;
  subBoxWidth: number;
  subFontColour: string;
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
          color: "#" + subFontColour,
          maxWidth: `${(subBoxWidth || 1) * 100}%`,
          fontSize: `${(subFontSize || 1) * 100}%`,
        }}
      ></div>
    </>
  );
}

export default SubtitleControl;
