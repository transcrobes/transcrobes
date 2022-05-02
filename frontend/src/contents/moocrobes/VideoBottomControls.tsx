import Fullscreen from "@mui/icons-material/Fullscreen";
import FullscreenExit from "@mui/icons-material/FullscreenExit";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VolumeDown from "@mui/icons-material/VolumeDown";
import VolumeMute from "@mui/icons-material/VolumeMute";
import VolumeUp from "@mui/icons-material/VolumeUp";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import React, { ReactElement } from "react";
import { Button as RAButton } from "react-admin";
import { useParams } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
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
  // onVolumeSeekDown: (event: React.ChangeEvent<unknown>, value: number | number[]) => void;
  onVolumeSeekDown: (event: Event | React.SyntheticEvent<Element, Event>, value: number | number[]) => void;
  // onVolumeChange: (event: React.ChangeEvent<unknown>, value: number | number[]) => void;
  onVolumeChange: (event: Event, value: number | number[]) => void;
  onRewind: () => void;
  onPlayPause: () => void;
  onFastForward: () => void;
  onToggleFullscreen: () => void;
}
const useStyles = makeStyles()((theme) => {
  return {
    controlsWrapper: {
      [theme.breakpoints.down("md")]: {
        padding: theme.spacing(1),
      },
      [theme.breakpoints.up("md")]: {
        padding: theme.spacing(2),
      },
    },
    timer: {
      // FIXME: should this colour be changeable?
      color: "#fff",
      [theme.breakpoints.down("md")]: {
        fontSize: "0.5rem",
        marginLeft: theme.spacing(1),
      },
      [theme.breakpoints.up("md")]: {
        fontSize: "1rem",
        marginLeft: theme.spacing(2),
      },
    },
    bottomIcons: {
      color: "#999",
      "&:hover": {
        color: theme.palette.getContrastText(theme.palette.background.default),
      },
      [theme.breakpoints.down("md")]: {
        "& svg": {
          fontSize: 15,
        },
      },
      [theme.breakpoints.up("md")]: {
        "& svg": {
          fontSize: 30,
        },
      },
    },
    volumeSlider: {
      width: 100,
    },
    volumeButton: {},
  };
});

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
  const { classes: localClasses } = useStyles();
  const { id = "" } = useParams<ContentParams>();
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
          <IconButton onClick={onPlayPause} className={localClasses.bottomIcons} size="large">
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton
            onClick={() => dispatch(actions.setMuted({ id: id, value: !muted }))}
            className={`${localClasses.bottomIcons} ${localClasses.volumeButton}`}
            size="large"
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
