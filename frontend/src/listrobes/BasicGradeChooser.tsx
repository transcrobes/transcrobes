import { Box, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import React from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { BASIC_GRADES } from "../components/Common";
import { GRADE } from "../database/Schema";
import { convertArrayToObject } from "../lib/funclib";
import { GraderConfig, GradesType, MIN_KNOWN_BEFORE_ADVANCED } from "../lib/types";
import { getColour } from "./funclib";

const GRADESOBJ = convertArrayToObject(BASIC_GRADES, "id");

type Props = {
  graderConfig: GraderConfig;
  setGraderConfig: React.Dispatch<React.SetStateAction<GraderConfig>>;
};
function getOrder(grades: GradesType[], value: string) {
  const first = grades.findIndex((x) => x.id === value);
  return [grades[first], ...grades.filter((x) => x.id !== value)];
}

export default function BasicGradeChooser({ graderConfig, setGraderConfig }: Props) {
  const theme = useTheme();
  const translate = useTranslate();
  const message = useAppSelector((state) => {
    const completed = Math.min(
      Object.keys(state.knownCards.allCardWordGraphs || {}).length / MIN_KNOWN_BEFORE_ADVANCED,
      1,
    );
    if (completed === 1) {
      return translate("screens.listrobes.minimum_training_complete");
    } else {
      return translate("screens.listrobes.percent_training_complete", {
        percentComplete: new Intl.NumberFormat("default", { style: "percent" }).format(completed),
      });
    }
  });

  return (
    <Box sx={{ marginInline: "auto", textAlign: "center" }}>
      <Typography variant="h6">{message}</Typography>
      <ToggleButtonGroup
        exclusive
        value={graderConfig.gradeOrder[0].id}
        onChange={(event: React.MouseEvent<HTMLElement>, value: string) => {
          setGraderConfig({ ...graderConfig, gradeOrder: getOrder(graderConfig.gradeOrder, value) });
        }}
      >
        <ToggleButton value={GRADE.GOOD.toString()}>
          <Box
            sx={{
              backgroundColor: getColour(GRADESOBJ[GRADE.GOOD.toString()], theme.palette),
              borderStyle: "solid",
              borderColor: theme.palette.background.default,
              display: "flex",
              justifyContent: "space-between",
              padding: "4px",
              margin: "4px",
            }}
          >
            <div>
              {translate("general.default")} {translate(GRADESOBJ[GRADE.GOOD.toString()].content)}
            </div>
            {GRADESOBJ[GRADE.GOOD.toString()].icon}
          </Box>
        </ToggleButton>

        <ToggleButton value={GRADE.UNKNOWN.toString()}>
          <Box
            sx={{
              backgroundColor: getColour(GRADESOBJ[GRADE.UNKNOWN.toString()], theme.palette),
              borderStyle: "solid",
              borderColor: theme.palette.background.default,
              display: "flex",
              justifyContent: "space-between",
              padding: "4px",
              margin: "4px",
            }}
          >
            <div>
              {translate("general.default")} {translate(GRADESOBJ[GRADE.UNKNOWN.toString()].content)}
            </div>
            {GRADESOBJ[GRADE.UNKNOWN.toString()].icon}
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
