import { makeStyles, Theme } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import { ReactElement } from "react";

interface Props {
  title: string;
}

const useStyles = makeStyles((theme: Theme) => ({
  topControls: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2),
    },
  },
  topControlsText: {
    color: "#fff",
  },
}));

function VideoHeaderControls({ title }: Props): ReactElement {
  const classes = useStyles();
  return (
    <Grid container direction="row" alignItems="center" justifyContent="space-between" className={classes.topControls}>
      <Grid item>
        <Typography variant="h5" className={classes.topControlsText}>
          {title}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default VideoHeaderControls;
