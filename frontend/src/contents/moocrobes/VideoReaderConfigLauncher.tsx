import { Box, Drawer, makeStyles, Theme } from "@material-ui/core";
import SettingsIcon from "@material-ui/icons/Settings";
import { ReactElement, useState } from "react";
import { Button } from "react-admin";
import useWindowDimensions from "../../hooks/WindowDimensions";
import VideoReaderConfig, { VideoReaderConfigProps } from "./VideoReaderConfig";

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

export default function VideoConfigLauncher({ containerRef, onSubDelayChange }: VideoReaderConfigProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const locClasses = useStyles();
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
      <Button className={locClasses.button} children={<SettingsIcon />} label="Settings" onClick={handleClick} />
      <Drawer container={containerRef?.current} anchor="left" open={open} onClose={handleClose}>
        <Box sx={{ width: width }} role="presentation">
          <VideoReaderConfig containerRef={containerRef} onSubDelayChange={onSubDelayChange} />
        </Box>
      </Drawer>
    </>
  );
}
