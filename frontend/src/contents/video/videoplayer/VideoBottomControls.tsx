import React, { ChangeEvent, ReactElement, ReactInstance, useRef, useState } from "react";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";
import IconButton from "@material-ui/core/IconButton";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import VolumeDown from "@material-ui/icons/VolumeDown";
import VolumeUp from "@material-ui/icons/VolumeUp";
import VolumeMute from "@material-ui/icons/VolumeMute";
import Fullscreen from "@material-ui/icons/Fullscreen";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Popover from "@material-ui/core/Popover";
import SettingsIcon from "@material-ui/icons/Settings";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import { Color } from "material-ui-color";

import FontBoxWidth from "./SubFontBoxWidth";
import FontSize from "./SubFontSize";
import SubFontColour from "./SubFontColour";
import SubDelay from "./SubDelay";
import PlaybackRate from "./SubPlaybackRate";
import Segmentation from "./SubSegmentation";
import { SubPosition } from "./types";
import { USER_STATS_MODE } from "../../../lib/lib";

interface Props {
  elapsedTime: string;
  classes: any;
  playing: boolean;
  volume: number;
  muted: boolean;
  totalDuration: string;
  playbackRate: number;
  subDelay: number;
  subBoxWidth: number;
  subFontSize: number;
  subFontColour: Color;
  subPosition: SubPosition;
  glossing: number;
  segmentation: boolean;
  onSubPositionChange: (position: SubPosition) => void;
  onSubFontColourChange: (colour: Color) => void;
  onSubBoxWidthChange: (width: number) => void;
  onSubFontSizeChange: (size: number) => void;

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
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
  onMute: () => void;
  onContentConfigUpdate: (contentConfig: { id: string; configString: string }) => void;
  onSubDelayChange: (delay: number) => void;
  onGlossingChange: (glossing: number) => void;
  onSegmentationChange: (event: ChangeEvent<HTMLInputElement>, segmentation: boolean) => void;
}

function VideoBottomControls({
  elapsedTime,
  classes,
  playing,
  volume,
  muted,
  playbackRate,
  totalDuration,
  subDelay,
  subBoxWidth,
  subFontSize,
  subFontColour,
  subPosition,
  glossing,
  segmentation,
  onSubPositionChange,
  onSubFontColourChange,
  onSubBoxWidthChange,
  onSubFontSizeChange,
  onChangeDisplayFormat,
  onSubDelayChange,
  onPlaybackRateChange,
  onMute,
  onPlayPause,
  onVolumeSeekDown,
  onVolumeChange,
  onSeekMouseDown,
  onToggleFullscreen,
  onGlossingChange,
  onSegmentationChange,
}: Props): ReactElement {
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
    <Grid
      container
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      style={{ padding: 16 }}
    >
      <Grid item>
        <Grid container alignItems="center">
          <IconButton onClick={onPlayPause} className={classes.bottomIcons}>
            {playing ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>

          <IconButton onClick={onMute} className={`${classes.bottomIcons} ${classes.volumeButton}`}>
            {muted ? (
              <VolumeMute fontSize="large" />
            ) : volume > 0.5 ? (
              <VolumeUp fontSize="large" />
            ) : (
              <VolumeDown fontSize="large" />
            )}
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
            <Typography variant="body1" style={{ color: "#fff", marginLeft: 16 }}>
              {elapsedTime}/{totalDuration}
            </Typography>
          </Button>

          <IconButton onClick={handleClick} aria-describedby={id} className={classes.bottomIcons}>
            <SettingsIcon fontSize="large" />
          </IconButton>

          <div ref={ref}>
            <Popover
              container={ref?.current as ReactInstance}
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
              <Grid container direction="column-reverse" style={{ backgroundColor: "black" }}>
                <SubFontColour
                  value={subFontColour}
                  classes={classes}
                  onValueChange={onSubFontColourChange}
                />
                <FontBoxWidth
                  onValueChange={onSubBoxWidthChange}
                  value={subBoxWidth}
                  classes={classes}
                />
                <FontSize
                  onValueChange={onSubFontSizeChange}
                  value={subFontSize}
                  classes={classes}
                />
                <SubDelay onValueChange={onSubDelayChange} value={subDelay} classes={classes} />
                <PlaybackRate
                  onValueChange={onPlaybackRateChange}
                  value={playbackRate}
                  classes={classes}
                />
                <div className={classes.select} title="Subs Position">
                  <Grid container direction="row" alignItems="center" justifyContent="center">
                    <Select
                      className={classes.select}
                      value={subPosition}
                      label="Position"
                      onChange={(event) => {
                        onSubPositionChange(event.target.value as SubPosition);
                      }}
                    >
                      <MenuItem value={"top"}>Top</MenuItem>
                      <MenuItem value={"bottom"}>Bottom</MenuItem>
                      <MenuItem value={"under"}>Under</MenuItem>
                    </Select>
                  </Grid>
                </div>
                <div className={classes.select} title="Glossing">
                  <Grid container direction="row" alignItems="center" justifyContent="center">
                    <Select
                      className={classes.select}
                      value={glossing}
                      label="Glossing"
                      onChange={(event) => {
                        onGlossingChange(event.target.value as number);
                      }}
                    >
                      <MenuItem value={USER_STATS_MODE.NO_GLOSS}>None</MenuItem>
                      <MenuItem value={USER_STATS_MODE.L2_SIMPLIFIED}>Simpler</MenuItem>
                      <MenuItem value={USER_STATS_MODE.TRANSLITERATION}>Sounds</MenuItem>
                      <MenuItem value={USER_STATS_MODE.L1}>English</MenuItem>
                    </Select>
                  </Grid>
                </div>
                <Segmentation
                  cssClasses={classes}
                  onValueChange={onSegmentationChange}
                  value={segmentation}
                />
                {/* FIXME: this is extremely nasty. I am horrible. Default nav height is 48. Sometimes */}
                <div style={{ height: "50px" }}></div>
              </Grid>
            </Popover>
          </div>
        </Grid>
      </Grid>

      <Grid item>
        <IconButton onClick={onToggleFullscreen} className={classes.bottomIcons}>
          <Fullscreen fontSize="large" />
        </IconButton>
      </Grid>
    </Grid>
  );
}

export default VideoBottomControls;
