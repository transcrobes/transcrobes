import { makeStyles, Theme } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import FastForwardIcon from "@material-ui/icons/FastForward";
import FastRewindIcon from "@material-ui/icons/FastRewind";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";
import { ReactElement } from "react";

interface Props {
  onPlayPause: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onSkipPreviousCue: () => void;
  onSkipNextCue: () => void;
  playing: boolean;
}

const useStyles = makeStyles((theme: Theme) => ({
  controlIcons: {
    color: "#777",
    [theme.breakpoints.down("sm")]: {
      fontSize: 15,
    },
    [theme.breakpoints.up("sm")]: {
      fontSize: 50,
    },
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
}));

function VideoCentralControls({
  onPlayPause,
  onRewind,
  onFastForward,
  onSkipPreviousCue,
  onSkipNextCue,
  playing,
}: Props): ReactElement {
  const classes = useStyles();
  return (
    <Grid container direction="row" alignItems="center" justifyContent="space-around">
      <IconButton onClick={onSkipPreviousCue} className={classes.controlIcons} aria-label="previous cue">
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
