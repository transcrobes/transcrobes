import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "./FineControl";

function FontSize({ classes, value, onValueChange }: FineControlImplProps): ReactElement {
  return (
    <FineControl
      title="Subtitle Font Size"
      labelLess="Decrease 5%"
      labelMore="Increase 5%"
      cssClasses={classes}
      isPercent={true}
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

export default FontSize;
