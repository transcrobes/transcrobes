import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { ReactElement } from "react";

interface Props {
  title: string;
}

function VideoHeaderControls({ title }: Props): ReactElement {
  const theme = useTheme();
  return (
    <Grid
      container
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        [theme.breakpoints.down("md")]: {
          padding: theme.spacing(1),
        },
        [theme.breakpoints.up("sm")]: {
          padding: theme.spacing(2),
        },
      }}
    >
      <Grid item>
        <Typography
          variant="h5"
          sx={{
            color: "#fff",
          }}
        >
          {title}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default VideoHeaderControls;
