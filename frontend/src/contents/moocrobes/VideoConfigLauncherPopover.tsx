import { ReactElement, useRef, useState } from "react";
import { IconButton, Popover } from "@material-ui/core";
import SettingsIcon from "@material-ui/icons/Settings";

import VideoConfig, { VideoConfigProps } from "./VideoConfig";

export default function VideoConfigLauncher({ ...props }: VideoConfigProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    setAnchorEl(event.currentTarget as HTMLElement);
  }

  function handleClose(): void {
    setAnchorEl(null);
  }

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <div ref={ref}>
      <IconButton onClick={handleClick} aria-describedby={id} className={props.classes.bottomIcons}>
        <SettingsIcon fontSize="large" />
      </IconButton>

      <Popover
        container={ref?.current}
        open={open}
        id={id}
        onClose={handleClose}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <VideoConfig containerRef={ref} {...props} />
      </Popover>
    </div>
  );
}
