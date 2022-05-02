import { ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { UserListProgress } from "../stats/ListProgress";

export default function GoalShow() {
  return (
    <Show actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/goals/" />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ReferenceField source="userList" reference="userlists" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ReferenceField source="parent" reference="goals" link="show">
          <TextField source="title" />
        </ReferenceField>
        <TextField source="priority" />
        <hr />
        <h3>Progress</h3>
        <UserListProgress />
      </SimpleShowLayout>
    </Show>
  );
}
