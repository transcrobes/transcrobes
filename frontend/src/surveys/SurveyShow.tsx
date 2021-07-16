import { FC, ReactElement } from "react";
import * as Survey from "survey-react";
import "survey-react/survey.css";
import { FieldProps, Show } from "react-admin";

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
  model.onComplete.add(function (sender) {
    saveData(sender.data, prop.record.id);
  });
  return <Survey.Survey model={model} />;
}

const SurveyShow: FC<FieldProps> = (props) => (
  <Show {...props}>
    <TheSurvey />
  </Show>
);

export default SurveyShow;
