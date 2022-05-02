import Grid from "@mui/material/Grid";
import { makeStyles } from "tss-react/mui";
import Typography from "@mui/material/Typography";
import { ReactElement } from "react";

interface Props {
  title: string;
}

const useStyles = makeStyles()((theme) => ({
  topControls: {
    [theme.breakpoints.down("md")]: {
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
  const { classes } = useStyles();
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
