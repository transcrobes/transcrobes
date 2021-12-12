import { ReactElement } from "react";
import styled from "styled-components";
import { RepetrobesActivityConfigType } from "../lib/types";

const ProgressStyle = styled.div<{ colour: string }>`
  background-color: ${(props) => props.colour || "inherit"};
  padding: 0.2em;
`;
interface ProgressProps {
  activityConfig: RepetrobesActivityConfigType;
  newToday: number;
  completedNewToday: number;
  availableNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
}

function progressColour(
  started: number,
  completed: number,
  maxTodo: number,
): "green" | "yellow" | "inherit" {
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
