import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import FineControl, { FineControlImplProps } from "../../components/FineControl";

function SubDelay({ className, value, onValueChange }: FineControlImplProps): ReactElement {
  const translate = useTranslate();
  return (
    <FineControl
      labelLess={translate("screens.moocrobes.config.subs_synchronisation.minus")}
      labelMore={translate("screens.moocrobes.config.subs_synchronisation.plus")}
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
