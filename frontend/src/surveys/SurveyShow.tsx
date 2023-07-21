import { ReactElement } from "react";
import * as ReactSurvey from "survey-react";
import "survey-react/survey.css";
import { Show, useRecordContext } from "react-admin";
import { useTheme } from "@mui/material";
import { Survey } from "../lib/types";
import { platformHelper } from "../app/createStore";

async function saveData(surveyData: string, surveyId: string) {
  const response = await platformHelper.saveSurvey({ dataValue: JSON.stringify(surveyData), surveyId: surveyId });
  console.debug(`got response back from saveSurvey SurveyShow.tsx:`, response);
  return "success";
}

function TheSurvey(): ReactElement {
  const record = useRecordContext<Survey>();
  if (!record) return <></>;
  const modelObjects = JSON.parse(record.surveyJson);
  const model = new ReactSurvey.Model(modelObjects);
  if (record.data) {
    model.data = JSON.parse(record.data);
  }
  model.onComplete.add((sender: any) => {
    if (record.id) saveData(sender.data, record.id.toString());
  });
  const palette = useTheme().palette;
  const themeColors = ReactSurvey.StylesManager.ThemeColors["default"];
  themeColors["$main-color"] = palette.primary.main;
  themeColors["$main-hover-color"] = palette.primary.dark;
  themeColors["$text-color"] = palette.text.primary;
  themeColors["$header-color"] = palette.secondary.main;
  themeColors["$border-color"] = palette.divider;
  themeColors["$header-background-color"] = palette.background.paper;
  themeColors["$body-background-color"] = palette.background.default;
  themeColors["$body-container-background-color"] = palette.background.paper;
  themeColors["$inputs-background-color"] = palette.background.paper;
  themeColors["$error-color"] = palette.error.main;
  themeColors["$error-background-color"] = palette.error.light;
  ReactSurvey.StylesManager.applyTheme("default");
  return <ReactSurvey.Survey model={model} />;
}

export default function SurveyShow() {
  return (
    <Show>
      <TheSurvey />
    </Show>
  );
}
