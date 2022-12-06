import { BooleanInput, Edit, ReferenceField, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function TeacherRegistrationEdit() {
  return (
    <Edit
      redirect="list"
      actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/studentregistrations/`} />}
    >
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <ReferenceField source="classId" reference="languageclasses" link="show">
          <TextField source="title" />
        </ReferenceField>
        <BooleanInput source="status" format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Edit>
  );
}
