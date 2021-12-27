import { makeStyles } from "@material-ui/core";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import React, { ReactElement } from "react";
import { HslColor } from "react-colorful";

import { Conftainer } from "../../components/Common";
import { isOnFullscreen } from "../../hooks/useFullscreen";
import { USER_STATS_MODE } from "../../lib/lib";
import SubDelay from "./SubDelay";
import SubFontBoxWidth from "./SubFontBoxWidth";
import SubFontColour from "./SubFontColour";
import FontSize from "./SubFontSize";
import { SubPosition } from "./types";
import PlaybackRate from "./PlaybackRate";
import SubPlaybackRate from "./SubPlaybackRate";

export interface VideoConfigProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  classes: any;
  playbackRate: number;
  subPlaybackRate: number;
  subDelay: number;
  subBoxWidth: number;
  subFontSize: number;
  subFontColour: HslColor;
  subPosition: SubPosition;
  glossing: number;
  segmentation: boolean;
  mouseover: boolean;
  onSubPositionChange: (position: SubPosition) => void;
  onSubFontColourChange: (colour: HslColor) => void;
  onSubBoxWidthChange: (width: number) => void;
  onSubFontSizeChange: (size: number) => void;
  onSubDelayChange: (delay: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSubPlaybackRateChange: (rate: number) => void;
  onGlossingChange: (glossing: number) => void;
  onSegmentationChange: (event: React.MouseEvent<HTMLElement>, segmentation: boolean) => void;
  onMouseoverChange: (event: React.MouseEvent<HTMLElement>, mouseover: boolean) => void;
}

const useStyles = makeStyles((theme) => ({
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em" },
  },
  [theme.breakpoints.down("sm")]: {
    buttonGroup: { flexWrap: "wrap", padding: "0.3em" },
  },
  button: { width: "100%" },
}));

export default function VideoConfig({
  classes,
  playbackRate,
  subPlaybackRate,
  subDelay,
  subBoxWidth,
  subFontSize,
  subFontColour,
  subPosition,
  glossing,
  segmentation,
  mouseover,
  onSubPositionChange,
  onSubFontColourChange,
  onSubBoxWidthChange,
  onSubFontSizeChange,
  onSubDelayChange,
  onPlaybackRateChange,
  onSubPlaybackRateChange,
  onGlossingChange,
  onSegmentationChange,
  onMouseoverChange,
}: VideoConfigProps): ReactElement {
  const localClasses = useStyles();
  return (
    <div>
      {/* FIXME: this is extremely nasty. I am horrible. Default nav height is 48. Sometimes */}
      {!isOnFullscreen() && <div style={{ height: "50px" }}></div>}
      <Conftainer>
        <ToggleButtonGroup
          className={localClasses.buttonGroup}
          value={glossing}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) => onGlossingChange(value)}
        >
          <ToggleButton className={localClasses.button} value={USER_STATS_MODE.NO_GLOSS}>
            None
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={USER_STATS_MODE.L2_SIMPLIFIED}>
            Simpler
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={USER_STATS_MODE.TRANSLITERATION}>
            Sounds
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={USER_STATS_MODE.L1}>
            English
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={USER_STATS_MODE.TRANSLITERATION_L1}>
            Sounds + English
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer>
        <ToggleButtonGroup
          className={localClasses.button}
          exclusive
          value={segmentation}
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            onSegmentationChange(event, value);
          }}
        >
          <ToggleButton className={localClasses.button} value={false}>
            None
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={true}>
            Segmented
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer>
        <ToggleButtonGroup
          className={localClasses.button}
          value={subPosition}
          title={"Subs position"}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: SubPosition) => {
            onSubPositionChange(value as SubPosition);
          }}
        >
          <ToggleButton className={localClasses.button} value="top">
            Top
          </ToggleButton>
          <ToggleButton className={localClasses.button} value="bottom">
            Bottom
          </ToggleButton>
          <ToggleButton className={localClasses.button} value="under">
            Under
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer>
        <ToggleButtonGroup
          className={localClasses.button}
          value={mouseover}
          exclusive
          onChange={(event: React.MouseEvent<HTMLElement>, value: boolean) => {
            onMouseoverChange(event, value);
          }}
        >
          <ToggleButton className={localClasses.button} value={false}>
            None
          </ToggleButton>
          <ToggleButton className={localClasses.button} value={true}>
            Display Mouseover
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <Conftainer>
        <SubFontBoxWidth
          onValueChange={onSubBoxWidthChange}
          value={subBoxWidth}
          classes={classes}
        />
      </Conftainer>
      <Conftainer>
        <FontSize onValueChange={onSubFontSizeChange} value={subFontSize} classes={classes} />
      </Conftainer>
      <Conftainer>
        <SubDelay onValueChange={onSubDelayChange} value={subDelay} classes={classes} />
      </Conftainer>
      <Conftainer>
        <PlaybackRate onValueChange={onPlaybackRateChange} value={playbackRate} classes={classes} />
      </Conftainer>
      <Conftainer>
        <SubPlaybackRate
          onValueChange={onSubPlaybackRateChange}
          value={subPlaybackRate}
          classes={classes}
        />
      </Conftainer>
      <Conftainer>
        <SubFontColour
          value={subFontColour}
          classes={classes}
          onValueChange={onSubFontColourChange}
        />
      </Conftainer>
    </div>
  );
}
