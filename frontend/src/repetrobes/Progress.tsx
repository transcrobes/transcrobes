import { Box, Theme, useTheme } from "@mui/material";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { RepetrobesActivityConfigType } from "../lib/types";
import useWindowDimensions from "../hooks/WindowDimensions";

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
  const { width } = useWindowDimensions();
  const translate = useTranslate();
  return (
    <div>
      <Box
        sx={{
          padding: "0.2em",
          backgroundColor: progressColour(
            theme,
            newToday,
            completedNewToday,
            Math.min(allNewToday, activityConfig.maxNew),
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
          backgroundColor: progressColour(
            theme,
            revisionsToday,
            completedRevisionsToday,
            Math.min(allRevisionsToday, activityConfig.maxRevisions),
          ),
        }}
      >
        {translate("screens.repetrobes.progress_revisions" + (width < 500 ? "_short" : ""), {
          completedRevisionsToday,
          revisionsToday,
          maxRevisions: Math.min(allRevisionsToday, activityConfig.maxRevisions),
          allRevisionsToday,
        })}
      </Box>
    </div>
  );
}
