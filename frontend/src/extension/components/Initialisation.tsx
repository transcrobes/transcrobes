import { Typography } from "@material-ui/core";

export default function Initialisation() {
  return (
    <>
      <Typography variant="h4">Initialisation started</Typography>
      <Typography>
        Please be patient while the initialisation finishes. The initialisation will give some updates but you should
        not be worried unless you see no update for over 5 minutes. No harm should come if you stop the initialisation
        by navigating away or closing the browser. The initialisation will pick up where it left off when you return.
      </Typography>
    </>
  );
}
