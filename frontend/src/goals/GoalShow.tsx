import { FC } from "react";
import { FieldProps, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { Goal } from "../lib/types";
import { UserListProgress } from "../userlists/UserListProgress";

const GoalShow: FC<FieldProps<Goal>> = (props) => (
  <Show {...props}>
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

export default GoalShow;
