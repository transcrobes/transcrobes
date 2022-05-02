import { Typography } from "@mui/material";

export default function Intro({ inited }: { inited: boolean }) {
  return !inited ? (
    <>
      <Typography variant="h4">Welcome! It's Transcrobes initialisation time!</Typography>
      <Typography>
        Transcrobes is entirely browser-based but needs to download a lot of reference data in order to save on
        bandwidth and dramatically improve performance, and that is going to take a while (15-25 minutes, depending on
        how fast your phone/tablet/computer is).
      </Typography>
      <Typography>
        The system needs to do quite a lot of work, so don't be alarmed if your devices heat up a bit and the fan
        switches on. It's normal, and will only happen once, at initialisation time. It's better to not interrupt the
        initialisation while it's happening, so make sure your device has plenty of battery, or is plugged in. It will
        also download 25-50MB of data so if you are not on wifi, make sure that is not a problem for your data plan.
      </Typography>
    </>
  ) : (
    <>
      <Typography variant="h4">Reinitialise Transcrobes or update settings</Typography>
      <Typography>
        You may need to reinitialise the system if you encounter issues, such as the system not transcrobing webpages.
        If it works on <b>some</b> pages then reinitilising won't have any effect, so keep this in mind. Reinitialising
        will take 15-25 minutes.
      </Typography>
      <Typography>
        Saving updated settings should only take a few seconds, unless you are changing your username. You may need to
        reinitialise if you change your username.
      </Typography>
    </>
  );
}
