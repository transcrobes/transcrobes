import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import FineControl, { FineControlImplProps } from "../../components/FineControl";

function PlaybackRate({ className, value, onValueChange }: FineControlImplProps): ReactElement {
  const translate = useTranslate();
  return (
    <FineControl
      labelLess={translate("screens.moocrobes.config.playback_rate.minus")}
      labelMore={translate("screens.moocrobes.config.playback_rate.plus")}
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
