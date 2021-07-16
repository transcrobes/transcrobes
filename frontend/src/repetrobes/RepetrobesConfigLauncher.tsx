import RepetrobesConfig from "./RepetrobesConfig";
import { StyledPopup, ConfigButton } from "../components/config";
import { RepetrobesActivityConfigType } from "../lib/types";

interface Props {
  loading: boolean;
  activityConfig: RepetrobesActivityConfigType;
  onConfigChange: (activityConfig: RepetrobesActivityConfigType) => void;
}

export default function RepetrobesConfigLauncher({
  loading,
  activityConfig,
  onConfigChange,
}: Props) {
  return (
    <div id="popup-root">
      <StyledPopup
        disabled={loading}
        trigger={(open) => <ConfigButton open={open} />}
        position="right top"
      >
        <RepetrobesConfig activityConfig={activityConfig} onConfigChange={onConfigChange} />
      </StyledPopup>
    </div>
  );
}
