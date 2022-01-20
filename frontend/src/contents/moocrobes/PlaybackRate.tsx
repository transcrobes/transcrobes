import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "../../components/FineControl";

function PlaybackRate({ className, value, onValueChange }: FineControlImplProps): ReactElement {
  return (
    <FineControl
      labelLess="Speed up by 5%"
      labelMore="Slow down by +5%"
      className={className}
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
