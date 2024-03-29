import { Edit, required, SimpleForm, TextField, TextInput, useTranslate } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN, IMPORTS_YT_VIDEO } from "../lib/types";

export default function ImportEdit() {
  return (
    <Edit
      redirect="list"
      actions={
        <HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/imports/`} ytUrl={IMPORTS_YT_VIDEO} />
      }
    >
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
      </SimpleForm>
    </Edit>
  );
}
