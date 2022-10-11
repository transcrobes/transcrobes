import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { ReactElement } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import HelpButton from "./components/HelpButton";
import WatchDemo from "./components/WatchDemo";
import { BROCROBES_WEB_STORE_URL, BROCROBES_YT_VIDEO, DOCS_DOMAIN } from "./lib/types";

const useStyles = makeStyles()({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default function Brocrobes(): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/install/clients/brocrobes/`;
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <CardHeader title={translate("screens.brocrobes.name")} />
        <WatchDemo url={BROCROBES_YT_VIDEO} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Card>
        <CardContent>
          <Typography paragraph={true}>{translate("screens.brocrobes.text_a")}</Typography>
          <Typography paragraph={true}>
            <a target="_blank" rel="noopener noreferrer" href={BROCROBES_WEB_STORE_URL}>
              {translate("screens.brocrobes.text_b")}
            </a>
          </Typography>
          <Typography paragraph={true}>{translate("screens.brocrobes.text_c")}</Typography>
          <Typography paragraph={true}>{translate("screens.brocrobes.text_d")}</Typography>
          <Typography paragraph={true}>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en&gl=GB"
            >
              {translate("screens.brocrobes.text_e")}
            </a>{" "}
          </Typography>
        </CardContent>
      </Card>
    </>
  );
}
