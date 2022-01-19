import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "../../components/FineControl";

function PlaybackRate({ classes, value, onValueChange }: FineControlImplProps): ReactElement {
  return (
    <FineControl
      title="Playback Rate"
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

export default PlaybackRate;
