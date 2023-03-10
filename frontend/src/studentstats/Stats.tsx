import { Box, Container, Divider, Typography } from "@mui/material";
import { ReactElement, useState } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import HelpButton from "../components/HelpButton";
import { DOCS_DOMAIN } from "../lib/types";
import { DayProgressRead } from "../stats/DayProgressRead";
import { DayProgressRevised } from "../stats/DayProgressRevised";
import { StudentSelector } from "./StudentSelector";

export default function Stats(): ReactElement {
  const translate = useTranslate();
  const [studentId, setStudentId] = useState<number | undefined>(undefined);

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/stats/`;
  return (
    <>
      <TopToolbar sx={{ alignItems: "center" }}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Container maxWidth="md">
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h4">
          {translate("screens.studentstats.name")}
        </Typography>
        <Divider />
        <Box>
          <StudentSelector
            onChange={(event) => {
              console.log("how is this the number", event.target.value);
              setStudentId(parseInt(event.target.value));
            }}
          />
        </Box>

        {/* <Divider />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.known_elements")}
        </Typography>
        <ListProgress studentId={studentId} yIsNumber={true} nbPeriods={6} periodType="month" /> */}

        <Divider />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.seen_looked_up")}
        </Typography>
        <DayProgressRead studentId={studentId} />

        <Divider />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.actively_revised")}
        </Typography>
        <DayProgressRevised studentId={studentId} />

        {/*
        FIXME: how to implement this without creating an usine a gaz?
        <Divider />
        <Typography sx={{ margin: 1, alignContent: "center" }} variant="h6">
          {translate("screens.stats.revisions_waiting")}
        </Typography>
        <WaitingRevisions studentId={studentId} /> */}
      </Container>
    </>
  );
}
