import { styled } from "@material-ui/core";
import { ReactElement } from "react";
import { RepetrobesActivityConfigType } from "../lib/types";

type ProgressColour = "green" | "yellow" | "inherit";

interface StyleProps {
  colour: ProgressColour;
  children?: React.ReactNode;
}

// TODO: consider the following style:
// const MyThemeComponent = styled('div', {...
// but need to work out what the obligatory params mean like shouldForwardProp, name, slot...
const ProgressStyle = styled(({ colour, children, ...other }: StyleProps) => {
  return <div {...other}>{children}</div>;
})({
  backgroundColor: ({ colour }: StyleProps) => colour || "inherit",
  padding: "0.2em",
});

interface ProgressProps {
  activityConfig: RepetrobesActivityConfigType;
  newToday: number;
  completedNewToday: number;
  availableNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
}

function progressColour(started: number, completed: number, maxTodo: number): ProgressColour {
  if (completed >= maxTodo) return "green";
  if (started >= maxTodo) return "yellow";
  return "inherit";
}

export default function Progress({
  activityConfig,
  newToday,
  completedNewToday,
  availableNewToday,
  revisionsToday,
  completedRevisionsToday,
  possibleRevisionsToday,
}: ProgressProps): ReactElement {
  const allRevisionsToday = revisionsToday + possibleRevisionsToday;
  const allNewToday = newToday + availableNewToday;
  return (
    <div>
      <ProgressStyle
        colour={progressColour(
          newToday,
          completedNewToday,
          Math.min(allNewToday, activityConfig.maxNew),
        )}
      >
        New: ({completedNewToday}) {newToday} / {Math.min(allNewToday, activityConfig.maxNew)} (
        {availableNewToday} available)
      </ProgressStyle>
      <ProgressStyle
        colour={progressColour(
          revisionsToday,
          completedRevisionsToday,
          Math.min(allRevisionsToday, activityConfig.maxRevisions),
        )}
      >
        Revisions: ({completedRevisionsToday}) {revisionsToday} /{" "}
        {Math.min(allRevisionsToday, activityConfig.maxRevisions)} ({allRevisionsToday} due)
      </ProgressStyle>
    </div>
  );
}
