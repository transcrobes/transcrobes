import { Container, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { ReactElement } from "react";
import { TopToolbar } from "react-admin";
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
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/stats/`;
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Container maxWidth="md">
        <Typography className={classes.header} variant="h4">
          My stats: reflect on progress
        </Typography>
        <hr />
        <Typography className={classes.header} variant="h6">
          Known words and characters (totals)
        </Typography>
        <ListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
        <hr />
        <Typography className={classes.header} variant="h6">
          Words seen and looked up (rates)
        </Typography>
        <DayProgressRead />
        <hr />
        <Typography className={classes.header} variant="h6">
          Words actively revised (rates)
        </Typography>
        <DayProgressRevised />
        <Typography className={classes.header} variant="h6">
          Revisions waiting (totals)
        </Typography>
        <WaitingRevisions />
      </Container>
    </>
  );
}
