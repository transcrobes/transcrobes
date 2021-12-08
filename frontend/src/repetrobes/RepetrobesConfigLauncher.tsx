import RepetrobesConfig from "./RepetrobesConfig";
import { StyledPopup, ConfigButton } from "../components/config";
import { RepetrobesActivityConfigType } from "../lib/types";
import { ReactElement } from "react";

interface Props {
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}

export default function RepetrobesConfigLauncher({
  activityConfig,
  onConfigChange,
}: Props): ReactElement {
  return (
    <div id="popup-root">
      <StyledPopup trigger={(open) => <ConfigButton open={open} />} position="right top">
        <RepetrobesConfig activityConfig={activityConfig} onConfigChange={onConfigChange} />
      </StyledPopup>
    </div>
  );
}
