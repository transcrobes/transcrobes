import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "./FineControl";

function SubsPlaybackRate({ classes, value, onValueChange }: FineControlImplProps): ReactElement {
  return (
    <FineControl
      title="Subtitle Playback Rate"
      labelLess="Speed up by 5%"
      labelMore="Slow down by +5%"
      cssClasses={classes}
      isPercent={false}
      onLess={() => {
        onValueChange(value - 0.05);
      }}
      onMore={() => {
        onValueChange(value + 0.05);
      }}
      value={value}
    />
  );
}

export default SubsPlaybackRate;
