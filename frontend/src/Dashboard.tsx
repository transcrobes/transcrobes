import { ReactElement } from "react";
import { Card, CardHeader } from "@material-ui/core";
import GoalsWidget from "./goals/GoalsWidget";
import { ComponentsConfig } from "./lib/complexTypes";

const styles = {
  flex: { display: "flex" },
  flexCentre: { display: "flex", justifyContent: "center" },
  flexColumn: { display: "flex", flexDirection: "column" },
  leftCol: { flex: 1, marginRight: "0.5em" },
  rightCol: { flex: 1, marginLeft: "0.5em" },
  singleCol: { marginTop: "1em", marginBottom: "1em" },
};

// const Spacer = () => <span style={{ width: "1em" }} />;
const VerticalSpacer = () => <span style={{ height: "1em" }} />;

interface Props {
  config: ComponentsConfig;
}
export default function Dashboard({ config }: Props): ReactElement {
  return (
    <>
      <div style={styles.flex}>
        <Card>
          <CardHeader title="Welcome to Transcrobes: Learn a language doing something you love" />
        </Card>
      </div>
      <VerticalSpacer />
      <div style={styles.flex}>
        <Card>
          <CardHeader title="Goals Progress" />
          <GoalsWidget config={config} />
        </Card>
      </div>
    </>
  );
}
