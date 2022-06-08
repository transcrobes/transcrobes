import { ReactElement, useEffect } from "react";
import { Box, Card, CardHeader, Typography } from "@mui/material";
import GoalsWidget from "./goals/GoalsWidget";
import { ComponentsConfig } from "./lib/complexTypes";
import { useAppSelector } from "./app/hooks";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";
import HelpButton from "./components/HelpButton";
import { TopToolbar } from "react-admin";
import { ListProgress } from "./stats/ListProgress";

interface Props {
  config: ComponentsConfig;
  inited: boolean;
}
export default function Dashboard({ config, inited }: Props): ReactElement {
  const username = useAppSelector((state) => state.userData.username);
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

  const helpUrl = "https://transcrob.es/page/software/learn/dashboard/";
  return (
    <>
      <TopToolbar
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <CardHeader title="Welcome to Transcrobes: Learn a language doing something you love" />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Box sx={{ marginLeft: "1em" }}>
        <Typography paragraph={true}>
          Explore the app and get help for each page using the dedicated <HelpButton url={helpUrl} /> button available
          on every screen.
        </Typography>
      </Box>

      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title="Goals Progress" />
        <GoalsWidget config={config} inited={inited} />
      </Card>
      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title="Known words and characters (totals)" />
        <ListProgress yIsNumber={true} nbPeriods={6} periodType="month" />
      </Card>
    </>
  );
}
