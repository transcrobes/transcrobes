import { ReactElement } from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";

interface Props {
  title: string;
  classes: any;
}

function VideoHeaderControls({ title, classes }: Props): ReactElement {
  return (
    <Grid
      container
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      className={classes.topControls}
    >
      <Grid item>
        <Typography variant="h5" className={classes.topControlsText}>
          {title}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default VideoHeaderControls;
