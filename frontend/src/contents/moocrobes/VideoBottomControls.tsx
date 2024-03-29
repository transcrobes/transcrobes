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
import { Theme } from "@mui/material/styles";
import React, { ReactElement } from "react";
import { Button as RAButton, useTranslate } from "react-admin";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import { DEFAULT_VIDEO_READER_CONFIG_STATE } from "../../lib/types";
import { VideoReaderConfigProps } from "./VideoReaderConfig";
import VideoReaderConfigLauncher from "./VideoReaderConfigLauncher";

interface Props extends VideoReaderConfigProps {
  id: string;
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
function bottomIcons(theme: Theme) {
  return {
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
  };
}

function VideoBottomControls({
  id,
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
  // const { classes: localClasses } = useStyles();
  const { muted, volume, timeDisplayFormat } = useAppSelector(
    (state) => state.videoReader[id] || DEFAULT_VIDEO_READER_CONFIG_STATE,
  );
  const dispatch = useAppDispatch();
  const translate = useTranslate();
  const actions = videoReaderActions;

  return (
    <Grid
      container
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      // className={localClasses.controlsWrapper}
      sx={(theme) => ({
        [theme.breakpoints.down("md")]: {
          padding: 0,
        },
        [theme.breakpoints.up("md")]: {
          padding: theme.spacing(2),
        },
      })}
    >
      <Grid item>
        <Grid container alignItems="center">
          <IconButton onClick={onPlayPause} sx={bottomIcons} size="large">
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton
            onClick={() => dispatch(actions.setMuted({ id: id, value: !muted }))}
            sx={bottomIcons}
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
            sx={{
              width: 100,
            }}
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
            <Typography
              variant="body1"
              sx={(theme) => {
                return {
                  [theme.breakpoints.down("md")]: {
                    fontSize: "0.5em",
                    marginLeft: theme.spacing(1),
                  },
                  [theme.breakpoints.up("md")]: {
                    fontSize: "1em",
                    marginLeft: theme.spacing(2),
                  },
                };
              }}
            >
              {elapsedTime}/{totalDuration}
            </Typography>
          </Button>

          <VideoReaderConfigLauncher {...props} id={id} />
        </Grid>
      </Grid>
      <Grid item>
        <RAButton
          sx={bottomIcons}
          children={isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          label={translate("screens.moocrobes.fullscreen")}
          onClick={onToggleFullscreen}
        />
      </Grid>
    </Grid>
  );
}

export default VideoBottomControls;
