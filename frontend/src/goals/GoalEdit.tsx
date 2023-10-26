import {
  AutocompleteInput,
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  required,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
} from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { DOCS_DOMAIN, STATUS } from "../lib/types";
import { regexfilterQuery } from "../ra-data-rxdb";

export default function GoalEdit() {
  return (
    <Edit redirect="list" actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <NumberInput max={10} min={1} defaultValue={5} source="priority" step={1} validate={[required()]} />
        <ReferenceInput
          sort={{ field: "title", order: "ASC" }}
          source="userList"
          reference="userlists"
          validate={[required()]}
        >
          <AutocompleteInput
            optionText="title"
            filterToQuery={(q) => regexfilterQuery("title", q)}
            validate={[required()]}
          />
        </ReferenceInput>
        <ReferenceInput source="parent" reference="goals" filter={{ status: STATUS.ACTIVE }}>
          <AutocompleteInput optionText="title" filterToQuery={(q) => regexfilterQuery("title", q)} />
        </ReferenceInput>
        <BooleanInput source="status" format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Edit>
  );
}
