import React, { FC } from "react";
import { FieldProps, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin"; // eslint-disable-line import/no-unresolved
import { Goal } from "../lib/types";

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
    </SimpleShowLayout>
  </Show>
);

export default GoalShow;
