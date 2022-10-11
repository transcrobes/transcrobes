import { Container, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { ReactElement } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import HelpButton from "../components/HelpButton";
import { DayProgressRead } from "./DayProgressRead";
import { DayProgressRevised } from "./DayProgressRevised";
import { ListProgress } from "./ListProgress";
import { WaitingRevisions } from "./WaitingRevisions";
import { DOCS_DOMAIN } from "../lib/types";

const useStyles = makeStyles()((theme) => ({
  root: { margin: theme.spacing(1), maxWidth: "800px" },
  header: { margin: theme.spacing(1), alignContent: "center" },
  toolbar: { alignItems: "center" },
  message: { color: "red", fontWeight: "bold", fontSize: "2em" },
}));

export default function Stats(): ReactElement {
  const { classes } = useStyles();
  const translate = useTranslate();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/stats/`;
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Container maxWidth="md">
        <Typography className={classes.header} variant="h4">
          {translate("screens.stats.title")}
        </Typography>
        <hr />
        <Typography className={classes.header} variant="h6">
          {translate("screens.stats.known_elements")}
        </Typography>
        <ListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
        <hr />
        <Typography className={classes.header} variant="h6">
          {translate("screens.stats.seen_looked_up")}
        </Typography>
        <DayProgressRead />
        <hr />
        <Typography className={classes.header} variant="h6">
          {translate("screens.stats.actively_revised")}
        </Typography>
        <DayProgressRevised />
        <Typography className={classes.header} variant="h6">
          {translate("screens.stats.revisions_waiting")}
        </Typography>
        <WaitingRevisions />
      </Container>
    </>
  );
}
