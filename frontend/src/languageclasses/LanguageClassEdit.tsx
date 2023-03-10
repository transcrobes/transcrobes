import { BooleanInput, Edit, required, SimpleForm, TextField, TextInput } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function LanguageClassEdit() {
  const user = useAppSelector((state) => state.userData.user);
  return (
    <Edit
      redirect="list"
      actions={
        <HelpEditActions
          noCreate={!user.isTeacher && !user.isAdmin}
          helpUrl={`//${DOCS_DOMAIN}/page/software/configure/languageclasses/`}
        />
      }
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
