import {
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

export default function GoalEdit() {
  return (
    <Edit redirect="list" actions={<HelpEditActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleForm>
        <TextField source="id" sx={{ paddingBottom: "1em" }} />
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <NumberInput max={10} min={1} defaultValue={5} source="priority" step={1} validate={[required()]} />
        <ReferenceInput sort={{ field: "name", order: "ASC" }} source="userList" reference="wordlists">
          <SelectInput validate={[required()]} optionText="name" />
        </ReferenceInput>
        <ReferenceInput source="parent" reference="goals" filter={{ status: STATUS.ACTIVE }}>
          <SelectInput optionText="title" defaultValue={""} />
        </ReferenceInput>
        <BooleanInput source="status" format={(v) => (v ? true : false)} parse={(v) => (v ? 1 : 0)} />
      </SimpleForm>
    </Edit>
  );
}
