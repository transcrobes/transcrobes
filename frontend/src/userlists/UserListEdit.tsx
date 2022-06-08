import { ReactElement } from "react";
import { Edit, SimpleForm, TextField, TextInput, required } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";

export default function UserListEdit(): ReactElement {
  return (
    <Edit
      redirect="list"
      actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/wordlists/" />}
    >
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput label="List name" source="title" validate={[required()]} />
        <TextInput label="List description" multiline source="description" />
      </SimpleForm>
    </Edit>
  );
}
