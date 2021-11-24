import { FC } from "react";
import { FieldProps, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { Goal } from "../lib/types";
import GoalProgress from "./GoalProgress";

const GoalShow: FC<FieldProps<Goal>> = (props) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="description" />
      <ReferenceField source="userList" reference="userlists">
        <TextField source="title" />
      </ReferenceField>
      <ReferenceField source="parent" reference="goals">
        <TextField source="title" />
      </ReferenceField>
      <TextField source="priority" />
      <hr />
      <h3>Progress</h3>
      <GoalProgress />
    </SimpleShowLayout>
  </Show>
);

export default GoalShow;
