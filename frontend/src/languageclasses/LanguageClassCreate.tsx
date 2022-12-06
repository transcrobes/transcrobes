import { BooleanInput, Create, NumberInput, required, SimpleForm, TextInput } from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function LanguageClassCreate() {
  return (
    <Create
      redirect="list"
      actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/languageclasses/`} />}
    >
      <SimpleForm>
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <BooleanInput source="status" defaultValue={1} format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Create>
  );
}
