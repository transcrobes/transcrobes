import { BooleanInput, Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function ContentEdit() {
  return (
    <Edit redirect="list" actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/contents/`} />}>
      <SimpleForm>
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
