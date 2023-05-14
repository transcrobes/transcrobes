import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { ReactElement } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import HelpButton from "./components/HelpButton";
import WatchDemo from "./components/WatchDemo";
import {
  BROCROBES_CHROME_WEB_STORE_URL,
  BROCROBES_EDGE_WEB_STORE_URL,
  BROCROBES_YT_VIDEO,
  BROCROBES_ZIP_URL,
  DOCS_DOMAIN,
  KIWI_LOCAL_URL,
  KIWI_PLAY_URL,
} from "./lib/types";

// const useStyles = makeStyles()({
//   toolbar: {
//   },
// });

export default function Brocrobes(): ReactElement {
  // const { classes } = useStyles();
  const translate = useTranslate();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/install/clients/brocrobes/`;
  return (
    <>
      <TopToolbar
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          maxHeight: "64px",
        }}
      >
        <CardHeader title={translate("screens.brocrobes.name")} />
        <WatchDemo url={BROCROBES_YT_VIDEO} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Card>
        <CardContent>
          <Typography paragraph={true}>{translate("screens.brocrobes.text_a")}</Typography>
          <Typography paragraph={true}>{translate("screens.brocrobes.text_c")}</Typography>
          <div>
            {translate("screens.brocrobes.text_b")}
            <ul>
              <li>
                <a target="_blank" rel="noopener noreferrer" href={BROCROBES_CHROME_WEB_STORE_URL}>
                  {translate("screens.brocrobes.text_b_chrome")}
                </a>
              </li>
              <li>
                <a target="_blank" rel="noopener noreferrer" href={BROCROBES_EDGE_WEB_STORE_URL}>
                  {translate("screens.brocrobes.text_b_edge")}
                </a>
              </li>
              <li>
                <a target="_blank" rel="noopener noreferrer" href={BROCROBES_ZIP_URL}>
                  {translate("screens.brocrobes.text_b_direct")}
                </a>
              </li>
            </ul>
          </div>
          <Typography paragraph={true}>{translate("screens.brocrobes.text_d")}</Typography>
          <div>
            {translate("screens.brocrobes.text_e")}
            <ul>
              <li>
                <a target="_blank" rel="noopener noreferrer" href={KIWI_PLAY_URL}>
                  {translate("screens.brocrobes.text_e_play")}
                </a>
              </li>
              <li>
                <a target="_blank" rel="noopener noreferrer" href={KIWI_LOCAL_URL}>
                  {translate("screens.brocrobes.text_e_direct")}
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
