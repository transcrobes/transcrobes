import { ReactElement } from "react";
import { Edit, SimpleForm, TextField, TextInput, required } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN, USERLISTS_YT_VIDEO } from "../lib/types";

export default function UserListEdit(): ReactElement {
  return (
    <Edit
      redirect="list"
      actions={
        <HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/wordlists/`} ytUrl={USERLISTS_YT_VIDEO} />
      }
    >
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput label="List name" source="title" validate={[required()]} />
        <TextInput label="List description" multiline source="description" />
      </SimpleForm>
    </Edit>
  );
}
