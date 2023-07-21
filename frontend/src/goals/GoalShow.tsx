import { BooleanField, ReferenceField, Show, SimpleShowLayout, TextField, useTranslate } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN } from "../lib/types";
import { ListProgress } from "../stats/ListProgress";
import { WordlistField } from "./WordlistField";

export default function GoalShow() {
  const translate = useTranslate();
  return (
    <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <WordlistField label="List" />
        <ReferenceField source="parent" reference="goals" link="show">
          <TextField source="title" />
        </ReferenceField>
        <TextField source="priority" />
        <BooleanField source="status" looseValue />
        <hr />
        <h3>{translate("resources.goals.progress")}</h3>
        <ListProgress />
      </SimpleShowLayout>
    </Show>
  );
}
