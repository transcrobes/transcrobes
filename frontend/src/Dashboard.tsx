import { Box, Card, CardHeader, Typography } from "@mui/material";
import { ReactElement } from "react";
import { TopToolbar, useTranslate } from "react-admin";
import { useAppSelector } from "./app/hooks";
import HelpButton from "./components/HelpButton";
import GoalsWidget from "./goals/GoalsWidget";
import { DOCS_DOMAIN } from "./lib/types";
import { ListProgress } from "./stats/ListProgress";

export default function Dashboard(): ReactElement {
  const inited = useAppSelector((state) => state.ui.rxdbInited && state.ui.sqliteInited);
  const translate = useTranslate();
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/dashboard/`;
  return inited ? (
    <>
      <TopToolbar
        sx={{
          justifyContent: "end",
          alignItems: "center",
          maxHeight: "64px",
        }}
      >
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <CardHeader
        title={`${translate("screens.main.dashboard.welcome.title")} ${translate(
          "screens.main.dashboard.welcome.subtitle",
        )}`}
      />
      <Box sx={{ marginLeft: "1em" }}>
        <Typography paragraph={true}>
          {translate("screens.main.dashboard.welcome.message_a")} <HelpButton url={helpUrl} />{" "}
          {translate("screens.main.dashboard.welcome.message_b")}
        </Typography>
      </Box>

      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title={translate("screens.main.dashboard.goals.title")} />
        <GoalsWidget />
      </Card>
      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title={translate("screens.main.dashboard.word_chars_progress.title")} />
        <ListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
      </Card>
    </>
  ) : (
    <></>
  );
}
