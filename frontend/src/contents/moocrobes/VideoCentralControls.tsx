import { makeStyles } from "tss-react/mui";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { ReactElement } from "react";

interface Props {
  onPlayPause: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onSkipPreviousCue: () => void;
  onSkipNextCue: () => void;
  playing: boolean;
}

const useStyles = makeStyles()((theme) => {
  return {
    controlIcons: {
      color: "#777",
      [theme.breakpoints.down("md")]: {
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
  };
});

function VideoCentralControls({
  onPlayPause,
  onRewind,
  onFastForward,
  onSkipPreviousCue,
  onSkipNextCue,
  playing,
}: Props): ReactElement {
  const { classes } = useStyles();
  return (
    <Grid container direction="row" alignItems="center" justifyContent="space-around">
      <IconButton onClick={onSkipPreviousCue} className={classes.controlIcons} aria-label="previous cue" size="large">
        <SkipPreviousIcon className={classes.controlIcons} fontSize="inherit" />
      </IconButton>
      <IconButton onClick={onRewind} className={classes.controlIcons} aria-label="rewind" size="large">
        <FastRewindIcon className={classes.controlIcons} fontSize="inherit" />
      </IconButton>
      <IconButton onClick={onPlayPause} className={classes.controlIcons} aria-label="play" size="large">
        {playing ? <PauseIcon fontSize="inherit" /> : <PlayArrowIcon fontSize="inherit" />}
      </IconButton>
      <IconButton onClick={onFastForward} className={classes.controlIcons} aria-label="forward" size="large">
        <FastForwardIcon fontSize="inherit" />
      </IconButton>
      <IconButton onClick={onSkipNextCue} className={classes.controlIcons} aria-label="next cue" size="large">
        <SkipNextIcon fontSize="inherit" />
      </IconButton>
    </Grid>
  );
}

export default VideoCentralControls;
