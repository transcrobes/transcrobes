import { ReactElement, useEffect } from "react";
import { Card, CardHeader } from "@mui/material";
import GoalsWidget from "./goals/GoalsWidget";
import { ComponentsConfig } from "./lib/complexTypes";
import { useAppSelector } from "./app/hooks";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";

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

  return (
    <>
      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title="Welcome to Transcrobes: Learn a language doing something you love" />
      </Card>
      <Card sx={{ marginTop: "1em" }}>
        <CardHeader title="Goals Progress" />
        <GoalsWidget config={config} inited={inited} />
      </Card>
    </>
  );
}
