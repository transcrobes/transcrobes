import React, { ReactElement } from "react";
import { Card, CardContent, CardHeader } from "@material-ui/core";

interface Props {}

export default function Brocrobes(props: Props): ReactElement {
  return (
    <Card>
      <CardHeader title="Brocrobes" />
      <CardContent>
        <p>
          Brocrobes is a browser extension, compatible with Google Chrome, Microsoft Edge, and other
          Chromium-derived browsers.
        </p>
        <p>
          You can download Brocrobes on the{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://chrome.google.com/webstore/detail/brocrobes/akeangohpdjllngpjiodmebgfhejbbpo?hl=en-GB"
          >
            Chrome Web Store
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
