import { ReactElement } from "react";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { TopToolbar } from "react-admin";
import HelpButton from "./components/HelpButton";
import { DOCS_DOMAIN } from "./lib/types";

const useStyles = makeStyles()({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default function Brocrobes(): ReactElement {
  const { classes } = useStyles();
  const helpUrl = `https://${DOCS_DOMAIN}/page/software/install/clients/brocrobes/`;
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <CardHeader title="Brocrobes" />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Card>
        <CardContent>
          <Typography paragraph={true}>
            Brocrobes is a browser extension, compatible with Google Chrome, Microsoft Edge, and other Chromium-derived
            browsers.
          </Typography>
          <Typography paragraph={true}>
            You can download Brocrobes on the{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://chrome.google.com/webstore/detail/brocrobes/akeangohpdjllngpjiodmebgfhejbbpo?hl=en-GB"
            >
              Chrome Web Store
            </a>
          </Typography>
          <Typography paragraph={true}>
            Brocrobes brings the power of Transcrobes to every page on the web, giving you the same comfort you get
            inside this application everywhere.
          </Typography>
          <Typography paragraph={true}>
            The main browser vendors don't support extentions on mobile (yet?) but you <b>can</b> use the{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en&gl=GB"
            >
              Kiwi Browser
            </a>{" "}
            on Android (though it will likely be a little slower than on the desktop). We are working with Yandex
            support to allow for support of Yandex Mobile at a future date.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
}
