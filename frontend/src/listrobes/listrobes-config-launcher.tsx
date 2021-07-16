import { IconContext } from "react-icons";

import { ListrobesConfig } from "./listrobes-config";
import { StyledPopup, ConfigButton } from "../components/config";
import { GraderConfig } from "../lib/types";

interface Props {
  loading: boolean;
  graderConfig: GraderConfig;
  onConfigChange: (graderConfig: GraderConfig) => void;
}

export function ListrobesConfigLauncher({ loading, graderConfig, onConfigChange }: Props) {
  return (
    <IconContext.Provider value={{ color: "blue", size: "2em" }}>
      <div id="popup-root">
        <StyledPopup
          disabled={loading}
          trigger={(open) => <ConfigButton open={open} />}
          position="right top"
        >
          <ListrobesConfig graderConfig={graderConfig} onConfigChange={onConfigChange} />
        </StyledPopup>
      </div>
    </IconContext.Provider>
  );
}
