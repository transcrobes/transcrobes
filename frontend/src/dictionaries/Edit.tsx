import { Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";

export default function AEdit() {
  return (
    <Edit actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/userdictionaries/" />}>
      <SimpleForm redirect="list">
        <TextField source="id" />
        <TextInput label="Dictionary name" source="title" validate={[required()]} />
        <TextInput label="Dictionary description" multiline source="description" />
      </SimpleForm>
    </Edit>
  );
}
