import { BooleanInput, Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";

export default function ContentEdit() {
  return (
    <Edit actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/contents/" />}>
      <SimpleForm redirect="list">
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput label="Content name" source="title" validate={[required()]} />
        <TextInput label="Content description" multiline source="description" />
        <TextInput source="author" />
        <TextInput source="cover" />
        <TextInput label="Language" source="lang" />
        <BooleanInput label="Shared" source="shared" />
      </SimpleForm>
    </Edit>
  );
}
