import { BooleanField, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN } from "../lib/types";
import { ListProgress } from "../stats/ListProgress";

export default function GoalShow() {
  return (
    <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ReferenceField source="userList" reference="wordlists" link={false}>
          <TextField source="name" />
        </ReferenceField>
        <ReferenceField source="parent" reference="goals" link="show">
          <TextField source="title" />
        </ReferenceField>
        <TextField source="priority" />
        <BooleanField source="status" label="Active" looseValue />
        <hr />
        <h3>Progress</h3>
        <ListProgress />
      </SimpleShowLayout>
    </Show>
  );
}
