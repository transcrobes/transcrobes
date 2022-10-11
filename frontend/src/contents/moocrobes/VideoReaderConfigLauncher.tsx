import { Box, Drawer } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import SettingsIcon from "@mui/icons-material/Settings";
import { ReactElement, useState } from "react";
import { Button, useTranslate } from "react-admin";
import useWindowDimensions from "../../hooks/WindowDimensions";
import VideoReaderConfig, { VideoReaderConfigProps } from "./VideoReaderConfig";

const useStyles = makeStyles()((theme) => ({
  button: {
    [theme.breakpoints.down("md")]: {
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
  const { classes: locClasses } = useStyles();
  const open = Boolean(anchorEl);
  const dimensions = useWindowDimensions();
  const width = dimensions.width < 600 ? dimensions.width * 0.8 : "inherit";
  const translate = useTranslate();

  function handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    setAnchorEl(event.currentTarget as HTMLElement);
  }
  function handleClose(): void {
    setAnchorEl(null);
  }
  return (
    <>
      <Button
        className={locClasses.button}
        children={<SettingsIcon />}
        label={translate("screens.moocrobes.config.title")}
        onClick={handleClick}
      />
      <Drawer container={containerRef?.current} anchor="left" open={open} onClose={handleClose}>
        <Box sx={{ width: width }} role="presentation">
          <VideoReaderConfig containerRef={containerRef} onSubDelayChange={onSubDelayChange} />
        </Box>
      </Drawer>
    </>
  );
}
