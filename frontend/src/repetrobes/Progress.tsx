import { styled, Theme, useTheme } from "@mui/material";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { RepetrobesActivityConfigType } from "../lib/types";

interface StyleProps {
  colour: string;
  children?: React.ReactNode;
}

// TODO: consider the following style:
// const MyThemeComponent = styled('div', {...
// but need to work out what the obligatory params mean like shouldForwardProp, name, slot...
const ProgressStyle = styled(({ colour, children, ...other }: StyleProps) => {
  return <div {...other}>{children}</div>;
})({
  // backgroundColor: ({ colour }: StyleProps) => colour || "inherit",
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

function progressColour(theme: Theme, started: number, completed: number, maxTodo: number): string {
  if (completed >= maxTodo) return theme.palette.success.main;
  if (started >= maxTodo) return theme.palette.warning.main;
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
  const theme = useTheme();
  const translate = useTranslate();
  // New: ({completedNewToday}) {newToday} / {Math.min(allNewToday, activityConfig.maxNew)} ({availableNewToday}{" "}
  // available)

  return (
    <div>
      <ProgressStyle
        colour={progressColour(theme, newToday, completedNewToday, Math.min(allNewToday, activityConfig.maxNew))}
      >
        {translate("screens.repetrobes.progress_new", {
          completedNewToday,
          newToday,
          maxNew: Math.min(allNewToday, activityConfig.maxNew),
          availableNewToday,
        })}
      </ProgressStyle>
      <ProgressStyle
        colour={progressColour(
          theme,
          revisionsToday,
          completedRevisionsToday,
          Math.min(allRevisionsToday, activityConfig.maxRevisions),
        )}
      >
        {translate("screens.repetrobes.progress_revisions", {
          completedRevisionsToday,
          revisionsToday,
          maxRevisions: Math.min(allRevisionsToday, activityConfig.maxRevisions),
          allRevisionsToday,
        })}
      </ProgressStyle>
    </div>
  );
}
