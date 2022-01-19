import { Grid, MenuItem, Select } from "@material-ui/core";
import React, { ChangeEvent, ReactElement } from "react";
import { HslColor } from "react-colorful";

import GlossingSelector from "../../components/GlossingSelector";
import SubDelay from "./SubDelay";
// import SubFontBoxWidth from "./SubFontBoxWidth";
import SubFontColour from "../../components/FontColour";
// import FontSize from "./SubFontSize";
import SubSwitch from "./SubSwitch";
import PlaybackRate from "./SubPlaybackRate";
import { SubPosition } from "./types";
import FivePercentFineControl from "../../components/FivePercentFineControl";

export interface VideoConfigProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  classes: any;
  playbackRate: number;
  subDelay: number;
  subBoxWidth: number;
  subFontSize: number;
  subFontColour: HslColor;
  glossFontColour: HslColor;
  glossFontSize: number;
  subPosition: SubPosition;
  glossing: number;
  segmentation: boolean;
  mouseover: boolean;
  onSubPositionChange: (position: SubPosition) => void;
  onSubFontSizeChange: (size: number) => void;
  onSubFontColourChange: (colour: HslColor) => void;
  onGlossFontSizeChange: (size: number) => void;
  onGlossFontColourChange: (colour: HslColor) => void;
  onSubBoxWidthChange: (width: number) => void;
  onSubDelayChange: (delay: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onGlossingChange: (glossing: number) => void;
  onSegmentationChange: (event: ChangeEvent<HTMLInputElement>, segmentation: boolean) => void;
  onMouseoverChange: (event: ChangeEvent<HTMLInputElement>, mouseover: boolean) => void;
}

export default function VideoConfig({
  containerRef,
  classes,
  playbackRate,
  subDelay,
  subBoxWidth,
  subFontSize,
  subFontColour,
  glossFontColour,
  glossFontSize,
  subPosition,
  glossing,
  segmentation,
  mouseover,
  onSubPositionChange,
  onSubFontSizeChange,
  onSubFontColourChange,
  onGlossFontSizeChange,
  onGlossFontColourChange,
  onSubBoxWidthChange,
  onSubDelayChange,
  onPlaybackRateChange,
  onGlossingChange,
  onSegmentationChange,
  onMouseoverChange,
}: VideoConfigProps): ReactElement {
  return (
    <div>
      <Grid container direction="column-reverse">
        <FivePercentFineControl
          label="Gloss font size"
          onValueChange={onGlossFontSizeChange}
          value={glossFontSize}
          classes={classes}
        />
        <SubFontColour
          value={glossFontColour}
          label="Gloss colour"
          classes={classes}
          onValueChange={onGlossFontColourChange}
        />
        <SubFontColour
          value={subFontColour}
          label="Subs colour"
          classes={classes}
          onValueChange={onSubFontColourChange}
        />
        <FivePercentFineControl
          label="Subs box width"
          onValueChange={onSubBoxWidthChange}
          value={subBoxWidth}
          classes={classes}
        />
        <FivePercentFineControl
          label="Subs font size"
          onValueChange={onSubFontSizeChange}
          value={subFontSize}
          classes={classes}
        />
        <SubDelay onValueChange={onSubDelayChange} value={subDelay} classes={classes} />
        <PlaybackRate onValueChange={onPlaybackRateChange} value={playbackRate} classes={classes} />
        <div className={classes.select} title="Subs Position">
          <Grid container direction="row" alignItems="center" justifyContent="center">
            <Select
              MenuProps={{ container: containerRef?.current }}
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
            <GlossingSelector
              containerRef={containerRef}
              className={classes.select}
              value={glossing}
              onChange={onGlossingChange}
            />
          </Grid>
        </div>
        <SubSwitch
          label="Mouseover"
          cssClasses={classes}
          onValueChange={onMouseoverChange}
          value={mouseover}
        />
        <SubSwitch
          label="Segmentation"
          cssClasses={classes}
          onValueChange={onSegmentationChange}
          value={segmentation}
        />
        {/* FIXME: this is extremely nasty. I am horrible. Default nav height is 48. Sometimes */}
        <div style={{ height: "50px" }}></div>
      </Grid>
    </div>
  );
}
