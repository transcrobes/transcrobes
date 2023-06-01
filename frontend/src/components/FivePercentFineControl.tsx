import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import FineControl, { FineControlImplProps } from "./FineControl";

function FivePercentFineControl({
  className,
  value,
  label,
  increment,
  onValueChange,
}: FineControlImplProps): ReactElement {
  const translate = useTranslate();
  return (
    <FineControl
      title={label || ""}
      labelLess={translate("widgets.fine_control.percent.less", { amount: (increment || 0.05) * 100 })}
      labelMore={translate("widgets.fine_control.percent.more", { amount: (increment || 0.05) * 100 })}
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
