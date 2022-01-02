import { FC, ReactElement } from "react";
import * as Survey from "survey-react";
import "survey-react/survey.css";
import { FieldProps, Show } from "react-admin";
import { useTheme } from "@material-ui/core";

const DATA_SOURCE = "surveyshow.tsx";

function saveData(surveyData: string, surveyId: string) {
  window.componentsConfig.proxy.sendMessage(
    {
      source: DATA_SOURCE,
      type: "saveSurvey",
      value: { dataValue: JSON.stringify(surveyData), surveyId: surveyId },
    },
    (response) => {
      console.debug(`got response back from saveSurvey SurveyShow.tsx:`, response);
      return "success";
    },
  );

  return true;
}

// FIXME: fix any
function TheSurvey(prop: any): ReactElement {
  const modelObjects = JSON.parse(prop.record.surveyJson);
  const model = new Survey.Model(modelObjects);
  if (prop.record.data) {
    model.data = JSON.parse(prop.record.data);
  }
  model.onComplete.add((sender: any) => {
    saveData(sender.data, prop.record.id);
  });
  const palette = useTheme().palette;
  const themeColors = Survey.StylesManager.ThemeColors["default"];
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
  Survey.StylesManager.applyTheme("default");
  return <Survey.Survey model={model} />;
}

const SurveyShow: FC<FieldProps> = (props) => (
  <Show {...props}>
    <TheSurvey />
  </Show>
);

export default SurveyShow;
