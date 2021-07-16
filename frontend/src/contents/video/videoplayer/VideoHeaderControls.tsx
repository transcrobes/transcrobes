import { ReactElement } from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import * as CSS from "csstype";

interface Props {
  title: string;
  titleStyle: CSS.Properties;
}

function VideoHeaderControls({ title, titleStyle }: Props): ReactElement {
  return (
    <Grid
      container
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      style={{ padding: 16 }}
    >
      <Grid item>
        <Typography variant="h5" style={titleStyle}>
          {title}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default VideoHeaderControls;
