import { BooleanField, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function StudentRegistrationShow() {
  return (
    <Show
      actions={<HelpShowActions forceEdit helpUrl={`//${DOCS_DOMAIN}/page/software/configure/studentregistrations/`} />}
    >
      <SimpleShowLayout>
        <TextField source="id" />
        <ReferenceField source="classId" reference="languageclasses" link="show">
          <TextField source="title" />
        </ReferenceField>
        <BooleanField source="status" looseValue />
      </SimpleShowLayout>
    </Show>
  );
}
