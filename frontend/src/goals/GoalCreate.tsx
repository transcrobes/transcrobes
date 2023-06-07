import {
  AutocompleteInput,
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  required,
  SimpleForm,
  TextInput,
} from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN, STATUS } from "../lib/types";
import { regexfilterQuery } from "../ra-data-rxdb";

export default function GoalCreate() {
  return (
    <Create redirect="list" actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleForm>
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <NumberInput max={10} min={1} defaultValue={5} source="priority" step={1} validate={[required()]} />
        <ReferenceInput
          sort={{ field: "name", order: "ASC" }}
          source="userList"
          reference="wordlists"
          validate={[required()]}
        >
          <AutocompleteInput
            optionText="name"
            filterToQuery={(q) => regexfilterQuery("name", q)}
            validate={[required()]}
          />
        </ReferenceInput>
        <ReferenceInput source="parent" reference="goals" filter={{ status: STATUS.ACTIVE }}>
          <AutocompleteInput optionText="title" filterToQuery={(q) => regexfilterQuery("title", q)} />
        </ReferenceInput>
        <BooleanInput source="status" defaultValue={1} format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Create>
  );
}
