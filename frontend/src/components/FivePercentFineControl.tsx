import { ReactElement } from "react";
import FineControl, { FineControlImplProps } from "./FineControl";

function FivePercentFineControl({
  className,
  value,
  label,
  increment,
  onValueChange,
}: FineControlImplProps): ReactElement {
  return (
    <FineControl
      title={label || ""}
      labelLess={`Decrease ${(increment || 0.05) * 100}%`}
      labelMore={`Increase ${(increment || 0.05) * 100}%`}
      className={className}
      isPercent={true}
      onLess={() => {
        onValueChange(value - (increment || 0.05));
      }}
      onMore={() => {
        onValueChange(value + (increment || 0.05));
      }}
      value={value}
    />
  );
}

export default FivePercentFineControl;
