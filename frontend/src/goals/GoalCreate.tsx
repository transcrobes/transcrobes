import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  required,
  SelectInput,
  SimpleForm,
  TextInput,
} from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN } from "../lib/types";

export default function GoalCreate() {
  return (
    <Create redirect="list" actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleForm>
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <NumberInput max={10} min={1} defaultValue={5} source="priority" step={1} validate={[required()]} />
        <ReferenceInput sort={{ field: "name", order: "ASC" }} source="userList" reference="wordlists">
          <SelectInput validate={[required()]} optionText="name" />
        </ReferenceInput>
        <ReferenceInput source="parent" reference="goals">
          <SelectInput optionText="title" />
        </ReferenceInput>
        <BooleanInput source="status" defaultValue={1} format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Create>
  );
}
