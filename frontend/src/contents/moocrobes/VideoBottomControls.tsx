import React, { ReactElement } from "react";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";
import IconButton from "@material-ui/core/IconButton";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import VolumeDown from "@material-ui/icons/VolumeDown";
import VolumeUp from "@material-ui/icons/VolumeUp";
import VolumeMute from "@material-ui/icons/VolumeMute";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import Button from "@material-ui/core/Button";
import { Button as RAButton } from "react-admin";
import Typography from "@material-ui/core/Typography";
import VideoConfigLauncher from "./VideoConfigLauncherDrawer";
import { VideoConfigProps } from "./VideoConfigDrawer";
import { makeStyles, Theme } from "@material-ui/core";

interface Props extends VideoConfigProps {
  elapsedTime: string;
  playing: boolean;
  volume: number;
  muted: boolean;
  totalDuration: string;
  isFullscreen: boolean;
  // eslint-disable-next-line @typescript-eslint/ban-types
  onSeekMouseDown: (_e: React.ChangeEvent<{}>) => void;
  // eslint-disable-next-line @typescript-eslint/ban-types
  onVolumeSeekDown: (event: React.ChangeEvent<{}>, value: number | number[]) => void;
  // eslint-disable-next-line @typescript-eslint/ban-types
  onVolumeChange: (event: React.ChangeEvent<{}>, value: number | number[]) => void;
  onRewind: () => void;
  onPlayPause: () => void;
  onFastForward: () => void;
  onChangeDisplayFormat: () => void;
  onToggleFullscreen: () => void;
  onMute: () => void;
  onContentConfigUpdate: (contentConfig: { id: string; configString: string }) => void;
}
const useStyles = makeStyles((theme: Theme) => ({
  controlsWrapper: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2),
    },
  },
  timer: {
    // FIXME: should this colour be changeable?
    color: "#fff",
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.5rem",
      marginLeft: theme.spacing(1),
    },
    [theme.breakpoints.up("sm")]: {
      fontSize: "1rem",
      marginLeft: theme.spacing(2),
    },
  },
}));

function VideoBottomControls({
  elapsedTime,
  classes,
  playing,
  volume,
  muted,
  totalDuration,
  isFullscreen,
  onChangeDisplayFormat,
  onMute,
  onPlayPause,
  onVolumeSeekDown,
  onVolumeChange,
  onSeekMouseDown,
  onToggleFullscreen,
  ...props
}: Props): ReactElement {
  const localClasses = useStyles();

  return (
    <Grid
      container
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      className={localClasses.controlsWrapper}
    >
      <Grid item>
        <Grid container alignItems="center">
          <IconButton onClick={onPlayPause} className={classes.bottomIcons}>
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton onClick={onMute} className={`${classes.bottomIcons} ${classes.volumeButton}`}>
            {muted ? <VolumeMute /> : volume > 0.5 ? <VolumeUp /> : <VolumeDown />}
          </IconButton>

          <Slider
            min={0}
            max={100}
            value={muted ? 0 : volume * 100}
            onChange={onVolumeChange}
            aria-labelledby="input-slider"
            className={classes.volumeSlider}
            onMouseDown={onSeekMouseDown}
            onChangeCommitted={onVolumeSeekDown}
          />
          <Button variant="text" onClick={onChangeDisplayFormat}>
            <Typography variant="body1" className={localClasses.timer}>
              {elapsedTime}/{totalDuration}
            </Typography>
          </Button>

          <VideoConfigLauncher classes={classes} {...props} />
        </Grid>
      </Grid>
      <Grid item>
        <RAButton
          className={classes.bottomIcons}
          children={isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          label="Fullscreen"
          onClick={onToggleFullscreen}
        />
      </Grid>
    </Grid>
  );
}

export default VideoBottomControls;
