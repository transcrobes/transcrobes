import { ReactElement, useEffect } from "react";
import { Card, CardHeader } from "@material-ui/core";
import GoalsWidget from "./goals/GoalsWidget";
import { ComponentsConfig } from "./lib/complexTypes";
import { getUsername, isInitialisedAsync } from "./lib/JWTAuthProvider";

const VerticalSpacer = () => <span style={{ height: "1em" }} />;

interface Props {
  config: ComponentsConfig;
  inited: boolean;
}
export default function Dashboard({ config, inited }: Props): ReactElement {
  useEffect(() => {
    (async () => {
      const username = await getUsername();
      if (!username || !(await isInitialisedAsync(username))) {
        window.location.href = "/#/init";
      }
    })();
  }, []);

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
