import { FC } from "react";
import { Edit, SimpleForm, TextField, TextInput, required, FieldProps } from "react-admin";
import { UserList } from "../lib/types";

const UserListEdit: FC<FieldProps<UserList>> = (props) => (
  <Edit {...props}>
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="List name" source="title" validate={[required()]} />
      <TextInput label="List description" multiline source="description" />
    </SimpleForm>
  </Edit>
);

export default UserListEdit;
