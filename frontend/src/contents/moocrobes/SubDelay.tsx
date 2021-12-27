import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "./FineControl";

function SubDelay({ classes, value, onValueChange }: FineControlImplProps): ReactElement {
  return (
    <FineControl
      title="Subtitle synchronisation"
      labelLess="Ahead 0.5s"
      labelMore="Behind 0.5s"
      cssClasses={classes}
      isPercent={false}
      onLess={() => {
        onValueChange(-0.5);
      }}
      onMore={() => {
        onValueChange(0.5);
      }}
      value={value}
    />
  );
}

export default SubDelay;
