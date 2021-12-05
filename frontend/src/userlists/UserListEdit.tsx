import { FC, ReactElement } from "react";
import { Edit, SimpleForm, TextField, TextInput, required, FieldProps } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { UserList } from "../lib/types";

const UserListEdit: FC<FieldProps<UserList>> = (props): ReactElement => {
  return (
    <Edit
      actions={
        <HelpEditActions helpUrl="https://transcrob.es/page/software/configure/wordlists/" />
      }
      {...props}
    >
      <SimpleForm redirect="list">
        <TextField source="id" />
        <TextInput label="List name" source="title" validate={[required()]} />
        <TextInput label="List description" multiline source="description" />
      </SimpleForm>
    </Edit>
  );
};

export default UserListEdit;
