import { makeStyles, Theme } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import Slider from "@material-ui/core/Slider";
import Typography from "@material-ui/core/Typography";
import Fullscreen from "@material-ui/icons/Fullscreen";
import FullscreenExit from "@material-ui/icons/FullscreenExit";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import VolumeDown from "@material-ui/icons/VolumeDown";
import VolumeMute from "@material-ui/icons/VolumeMute";
import VolumeUp from "@material-ui/icons/VolumeUp";
import React, { ReactElement } from "react";
import { Button as RAButton } from "react-admin";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { DEFAULT_VIDEO_READER_CONFIG_STATE, videoReaderActions } from "../../features/content/videoReaderSlice";
import { ContentParams } from "../../lib/types";
import { VideoReaderConfigProps } from "./VideoReaderConfig";
import VideoConfigLauncher from "./VideoReaderConfigLauncher";

interface Props extends VideoReaderConfigProps {
  elapsedTime: string;
  playing: boolean;
  totalDuration: string;
  isFullscreen: boolean;
  onSeekMouseDown: (_e: React.ChangeEvent<unknown>) => void;
  onVolumeSeekDown: (event: React.ChangeEvent<unknown>, value: number | number[]) => void;
  onVolumeChange: (event: React.ChangeEvent<unknown>, value: number | number[]) => void;
  onRewind: () => void;
  onPlayPause: () => void;
  onFastForward: () => void;
  onToggleFullscreen: () => void;
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
  bottomIcons: {
    color: "#999",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
    },
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
  volumeSlider: {
    width: 100,
  },
  volumeButton: {},
}));

function VideoBottomControls({
  elapsedTime,
  playing,
  totalDuration,
  isFullscreen,
  onPlayPause,
  onVolumeSeekDown,
  onVolumeChange,
  onSeekMouseDown,
  onToggleFullscreen,
  ...props
}: Props): ReactElement {
  const localClasses = useStyles();
  const { id } = useParams<ContentParams>();
  const { muted, volume, timeDisplayFormat } = useAppSelector(
    (state) => state.videoReader[id] || DEFAULT_VIDEO_READER_CONFIG_STATE,
  );
  const dispatch = useAppDispatch();
  const actions = videoReaderActions;

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
          <IconButton onClick={onPlayPause} className={localClasses.bottomIcons}>
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton
            onClick={() => dispatch(actions.setMuted({ id: id, value: !muted }))}
            className={`${localClasses.bottomIcons} ${localClasses.volumeButton}`}
          >
            {muted ? <VolumeMute /> : volume > 0.5 ? <VolumeUp /> : <VolumeDown />}
          </IconButton>

          <Slider
            min={0}
            max={100}
            value={muted ? 0 : volume * 100}
            onChange={onVolumeChange}
            aria-labelledby="input-slider"
            className={localClasses.volumeSlider}
            onMouseDown={onSeekMouseDown}
            onChangeCommitted={onVolumeSeekDown}
          />
          <Button
            variant="text"
            onClick={() =>
              dispatch(
                videoReaderActions.setTimeDisplayFormat({
                  id: id,
                  value: timeDisplayFormat === "normal" ? "remaining" : "normal",
                }),
              )
            }
          >
            <Typography variant="body1" className={localClasses.timer}>
              {elapsedTime}/{totalDuration}
            </Typography>
          </Button>

          <VideoConfigLauncher {...props} />
        </Grid>
      </Grid>
      <Grid item>
        <RAButton
          className={localClasses.bottomIcons}
          children={isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          label="Fullscreen"
          onClick={onToggleFullscreen}
        />
      </Grid>
    </Grid>
  );
}

export default VideoBottomControls;
