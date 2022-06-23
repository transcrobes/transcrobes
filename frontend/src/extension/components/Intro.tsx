import { Typography } from "@mui/material";
import { Box } from "@mui/system";

export default function Intro({ inited }: { inited: boolean }) {
  return !inited ? (
    <Box sx={(theme) => ({ margin: theme.spacing(2) })}>
      <Typography variant="h4">Welcome! It's Transcrobes initialisation time!</Typography>
      <Typography>
        Transcrobes is entirely browser-based but needs to download a lot of reference data in order to save on
        bandwidth and dramatically improve performance, and that is going to take a while (3-10 minutes, depending on
        how fast your phone/tablet/computer is).
      </Typography>
      <Typography>
        The system needs to do quite a lot of work, so don't be alarmed if your devices heat up a bit and the fan
        switches on. It's normal, and will only happen once, at initialisation time. It's better to not interrupt the
        initialisation while it's happening, so make sure your device has plenty of battery, or is plugged in. It will
        also download 25-50MB of data so if you are not on wifi, make sure that is not a problem for your data plan.
      </Typography>
    </Box>
  ) : (
    <Box sx={(theme) => ({ margin: theme.spacing(2) })}>
      <Typography variant="h4">Update settings</Typography>
      <Typography>
        Saving updated settings should only take a few seconds, unless you are changing your username. You may need to
        reinstall the extension (delete and add again) if you change your username and encounter issues.
      </Typography>
    </Box>
  );
}
