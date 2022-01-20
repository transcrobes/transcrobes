import { ReactElement, useEffect } from "react";
import { Card, CardHeader } from "@material-ui/core";
import GoalsWidget from "./goals/GoalsWidget";
import { ComponentsConfig } from "./lib/complexTypes";
import { useAppSelector } from "./app/hooks";
import { getUserDexie, isInitialisedAsync } from "./database/authdb";

const VerticalSpacer = () => <span style={{ height: "1em" }} />;

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
          window.location.href = "/#/init";
        }
      }
    })();
  }, [username]);

  return (
    <>
      <Card>
        <CardHeader title="Welcome to Transcrobes: Learn a language doing something you love" />
      </Card>
      <VerticalSpacer />
      <Card>
        <CardHeader title="Goals Progress" />
        <GoalsWidget config={config} inited={inited} />
      </Card>
    </>
  );
}
