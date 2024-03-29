import { Container, Typography } from "@mui/material";
import { ReactElement } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import HelpButton from "../components/HelpButton";
import { DOCS_DOMAIN } from "../lib/types";
import { DayProgressRead } from "../stats/DayProgressRead";
import { DayProgressRevised } from "../stats/DayProgressRevised";
import { ListProgress } from "../stats/ListProgress";
import { WaitingRevisions } from "../stats/WaitingRevisions";

export default function Stats(): ReactElement {
  const translate = useTranslate();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/stats/`;
  return (
    <>
      <TopToolbar sx={{ alignItems: "center" }}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Container maxWidth="md">
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h4">
          {translate("screens.stats.title")}
        </Typography>
        <hr />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.known_elements")}
        </Typography>
        <ListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
        <hr />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.seen_looked_up")}
        </Typography>
        <DayProgressRead />
        <hr />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.actively_revised")}
        </Typography>
        <DayProgressRevised />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.revisions_waiting")}
        </Typography>
        <WaitingRevisions />
      </Container>
    </>
  );
}
