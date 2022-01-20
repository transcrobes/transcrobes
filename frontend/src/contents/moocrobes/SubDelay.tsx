import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "../../components/FineControl";

function SubDelay({ className, value, onValueChange }: FineControlImplProps): ReactElement {
  return (
    <FineControl
      labelLess="Ahead 0.5s"
      labelMore="Behind 0.5s"
      className={className}
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
