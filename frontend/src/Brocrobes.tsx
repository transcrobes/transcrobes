import { ReactElement } from "react";
import { Card, CardContent, CardHeader, Typography } from "@material-ui/core";

export default function Brocrobes(): ReactElement {
  return (
    <Card>
      <CardHeader title="Brocrobes" />
      <CardContent>
        <Typography paragraph={true}>
          Brocrobes is a browser extension, compatible with Google Chrome, Microsoft Edge, and other
          Chromium-derived browsers.
        </Typography>
        <Typography paragraph={true}>
          On Android, you can use the{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en&gl=GB"
          >
            Kiwi Browser
          </a>
          . We are working with Yandex support to allow for support of Yandex at a future date.
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
      </CardContent>
    </Card>
  );
}
