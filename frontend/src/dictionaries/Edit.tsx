import { Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function AEdit() {
  return (
    <Edit actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/userdictionaries/`} />}>
      <SimpleForm redirect="list">
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
      </SimpleForm>
    </Edit>
  );
}
