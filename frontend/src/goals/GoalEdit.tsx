import {
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

export default function GoalEdit() {
  return (
    <Edit actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/goals/" />}>
      <SimpleForm redirect="list">
        <TextField source="id" />
        <TextInput label="Goal name" source="title" validate={[required()]} />
        <TextInput label="Goal description" multiline source="description" />
        <NumberInput max={10} min={1} defaultValue={5} source="priority" step={1} validate={[required()]} />
        <ReferenceInput
          sort={{ field: "title", order: "ASC" }}
          label="User list"
          source="userList"
          reference="userlists"
        >
          <SelectInput validate={[required()]} optionText="title" />
        </ReferenceInput>
        <ReferenceInput label="Parent" source="parent" reference="goals">
          <SelectInput optionText="title" />
        </ReferenceInput>
      </SimpleForm>
    </Edit>
  );
}
