import { Box, Theme, useTheme } from "@mui/material";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import useWindowDimensions from "../hooks/WindowDimensions";
import { RepetrobesActivityConfigType } from "../lib/types";

interface ProgressProps {
  activityConfig: RepetrobesActivityConfigType;
  newToday: number;
  completedNewToday: number;
  availableNewToday: number;
  revisionsToday: number;
  completedRevisionsToday: number;
  possibleRevisionsToday: number;
  currentIsNew: boolean;
}

function progressColour(theme: Theme, started: number, completed: number, maxTodo: number, current: boolean) {
  let backgroundColor = "inherit";
  let color = current ? theme.palette.warning.main : "inherit";
  if (completed >= maxTodo) {
    backgroundColor = theme.palette.success.main;
    color = current ? theme.palette.warning.main : theme.palette.success.contrastText;
  } else if (started >= maxTodo) {
    backgroundColor = theme.palette.info.main;
    color = current ? theme.palette.warning.main : theme.palette.info.contrastText;
  }
  return { backgroundColor, color };
}

export default function Progress({
  activityConfig,
  newToday,
  completedNewToday,
  availableNewToday,
  revisionsToday,
  completedRevisionsToday,
  possibleRevisionsToday,
  currentIsNew,
}: ProgressProps): ReactElement {
  const allRevisionsToday = revisionsToday + possibleRevisionsToday;
  const allNewToday = newToday + availableNewToday;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const translate = useTranslate();
  return (
    <div>
      <Box
        sx={{
          padding: "0.2em",
          ...progressColour(
            theme,
            newToday,
            completedNewToday,
            Math.min(allNewToday, activityConfig.maxNew),
            currentIsNew,
          ),
        }}
      >
        {translate("screens.repetrobes.progress_new" + (width < 500 ? "_short" : ""), {
          completedNewToday,
          newToday,
          maxNew: Math.min(allNewToday, activityConfig.maxNew),
          availableNewToday,
        })}
      </Box>
      <Box
        sx={{
          padding: "0.2em",
          ...progressColour(
            theme,
            revisionsToday,
            completedRevisionsToday,
            Math.min(allRevisionsToday, activityConfig.maxRevisions),
            !currentIsNew,
          ),
        }}
      >
        {translate("screens.repetrobes.progress_revisions" + (width < 500 ? "_short" : ""), {
          completedRevisionsToday,
          revisionsToday,
          maxRevisions: Math.min(allRevisionsToday, activityConfig.maxRevisions),
          allRevisionsToday: allRevisionsToday - completedRevisionsToday,
        })}
      </Box>
    </div>
  );
}
