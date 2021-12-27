import { ReactElement, useState } from "react";
import SettingsIcon from "@material-ui/icons/Settings";
import { Button } from "react-admin";
import { Box, Drawer, makeStyles, Theme } from "@material-ui/core";

import useWindowDimensions from "../../hooks/WindowDimensions";
import VideoConfigDrawer, { VideoConfigProps } from "./VideoConfigDrawer";

const useStyles = makeStyles((theme: Theme) => ({
  button: {
    [theme.breakpoints.down("sm")]: {
      "& svg": {
        fontSize: 15,
      },
    },
    [theme.breakpoints.up("sm")]: {
      "& svg": {
        fontSize: 30,
      },
    },
  },
}));

export default function VideoConfigLauncher({ ...props }: VideoConfigProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // const ref = useRef<HTMLDivElement>(null);
  const classes = useStyles();
  const open = Boolean(anchorEl);
  const dimensions = useWindowDimensions();
  const width = dimensions.width < 600 ? dimensions.width * 0.8 : "inherit";

  function handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    setAnchorEl(event.currentTarget as HTMLElement);
  }
  function handleClose(): void {
    setAnchorEl(null);
  }
  return (
    <>
      <Button
        className={classes.button}
        children={<SettingsIcon />}
        label="Settings"
        onClick={handleClick}
      />
      <Drawer
        container={props.containerRef?.current}
        anchor="left"
        open={open}
        onClose={handleClose}
      >
        <Box sx={{ width: width }} role="presentation">
          <VideoConfigDrawer containerRef={props.containerRef} {...props} />
        </Box>
      </Drawer>
    </>
  );
}
