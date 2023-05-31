import { ReactElement, useEffect } from "react";
import { Box, Card, CardHeader, Typography } from "@mui/material";
import GoalsWidget from "./goals/GoalsWidget";
import { ComponentsConfig } from "./lib/complexTypes";
import { useAppSelector } from "./app/hooks";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import HelpButton from "./components/HelpButton";
import { TopToolbar, useTranslate } from "react-admin";
import { ListProgress } from "./stats/ListProgress";
import { DOCS_DOMAIN } from "./lib/types";

interface Props {
  config: ComponentsConfig;
  inited: boolean;
}
export default function Dashboard({ config, inited }: Props): ReactElement {
  const username = useAppSelector((state) => state.userData.username);
  const translate = useTranslate();
  useEffect(() => {
    (async () => {
      if (!username) {
        const realUser = await getUserDexie();
        if (realUser.username && !(await isInitialisedAsync(realUser.username))) {
          // FIXME: should this be a navigate?
          window.location.href = "/#/init";
        }
      }
    })();
  }, [username]);

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/dashboard/`;
  return (
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
        <GoalsWidget config={config} inited={inited} />
      </Card>
      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title={translate("screens.main.dashboard.word_chars_progress.title")} />
        <ListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
      </Card>
    </>
  );
}
