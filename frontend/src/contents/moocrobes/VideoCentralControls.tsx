import { ReactElement } from "react";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import FastRewindIcon from "@material-ui/icons/FastRewind";
import FastForwardIcon from "@material-ui/icons/FastForward";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";

interface Props {
  classes: any;
  onPlayPause: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onSkipPreviousCue: () => void;
  onSkipNextCue: () => void;
  playing: boolean;
}

function VideoCentralControls({
  classes,
  onPlayPause,
  onRewind,
  onFastForward,
  onSkipPreviousCue,
  onSkipNextCue,
  playing,
}: Props): ReactElement {
  return (
    <Grid container direction="row" alignItems="center" justifyContent="space-around">
      <IconButton
        onClick={onSkipPreviousCue}
        className={classes.controlIcons}
        aria-label="previous cue"
      >
        <SkipPreviousIcon className={classes.controlIcons} fontSize="inherit" />
      </IconButton>
      <IconButton onClick={onRewind} className={classes.controlIcons} aria-label="rewind">
        <FastRewindIcon className={classes.controlIcons} fontSize="inherit" />
      </IconButton>
      <IconButton onClick={onPlayPause} className={classes.controlIcons} aria-label="play">
        {playing ? <PauseIcon fontSize="inherit" /> : <PlayArrowIcon fontSize="inherit" />}
      </IconButton>
      <IconButton onClick={onFastForward} className={classes.controlIcons} aria-label="forward">
        <FastForwardIcon fontSize="inherit" />
      </IconButton>
      <IconButton onClick={onSkipNextCue} className={classes.controlIcons} aria-label="next cue">
        <SkipNextIcon fontSize="inherit" />
      </IconButton>
    </Grid>
  );
}

export default VideoCentralControls;
