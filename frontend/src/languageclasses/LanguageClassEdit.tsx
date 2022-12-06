import { BooleanInput, Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function LanguageClassEdit() {
  return (
    <Edit
      redirect="list"
      actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/languageclasses/`} />}
    >
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <BooleanInput source="status" format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Edit>
  );
}
