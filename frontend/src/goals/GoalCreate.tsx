import { Create, NumberInput, ReferenceInput, required, SelectInput, SimpleForm, TextInput } from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN, PROCESSING, STATUS } from "../lib/types";

export default function GoalCreate() {
  return (
    <Create redirect="list" actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />}>
      <SimpleForm>
        <TextInput label="Goal name" source="title" validate={[required()]} />
        <TextInput label="Goal description" multiline source="description" />
        <NumberInput max={10} min={1} defaultValue={5} source="priority" step={1} validate={[required()]} />
        <ReferenceInput
          sort={{ field: "title", order: "ASC" }}
          label="User list"
          source="userList"
          reference="userlists"
          filter={{ status: STATUS.ACTIVE, processing: PROCESSING.FINISHED }}
        >
          <SelectInput validate={[required()]} optionText="title" />
        </ReferenceInput>
        <ReferenceInput label="Parent" source="parent" reference="goals">
          <SelectInput optionText="title" />
        </ReferenceInput>
      </SimpleForm>
    </Create>
  );
}
