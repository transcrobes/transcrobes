import { Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function ImportEdit() {
  return (
    <Edit redirect="list" actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/imports/`} />}>
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput label="Import name" source="title" validate={[required()]} />
        <TextInput label="Import description" multiline source="description" />
      </SimpleForm>
    </Edit>
  );
}
