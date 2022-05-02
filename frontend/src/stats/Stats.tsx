import { Container, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { ReactElement } from "react";
import { TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { DayProgressRead } from "./DayProgressRead";
import { DayProgressRevised } from "./DayProgressRevised";
import { UserListProgress } from "./ListProgress";

const useStyles = makeStyles()((theme) => ({
  root: { margin: theme.spacing(1), maxWidth: "800px" },
  header: { margin: theme.spacing(1), alignContent: "center" },
  toolbar: { alignItems: "center" },
  message: { color: "red", fontWeight: "bold", fontSize: "2em" },
}));

export default function Stats(): ReactElement {
  const { classes } = useStyles();
  const helpUrl = "https://transcrob.es/page/software/learn/stats/";
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
          Known words
        </Typography>
        <UserListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
        <hr />
        <Typography className={classes.header} variant="h6">
          Words seen and looked up
        </Typography>
        <DayProgressRead />
        <hr />
        <Typography className={classes.header} variant="h6">
          Words actively revised
        </Typography>
        <DayProgressRevised />
      </Container>
    </>
  );
}
