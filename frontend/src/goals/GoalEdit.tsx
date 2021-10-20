import { FC } from "react";
import {
  Edit,
  SimpleForm,
  TextField,
  TextInput,
  required,
  FieldProps,
  NumberInput,
  ReferenceInput,
  SelectInput,
} from "react-admin";
import { Goal } from "../lib/types";

const GoalEdit: FC<FieldProps<Goal>> = (props) => (
  <Edit {...props}>
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="Goal name" source="title" validate={[required()]} />
      <TextInput label="Goal description" multiline source="description" />
      <NumberInput max={10} min={1} source="priority" step={1} />
      <ReferenceInput
        label="User list"
        source="userList"
        validate={[required()]}
        reference="userlists"
      >
        <SelectInput allowEmpty={false} optionText="title" />
      </ReferenceInput>
      <ReferenceInput label="Parent" source="parent" reference="goals">
        <SelectInput allowEmpty={true} optionText="title" />
      </ReferenceInput>
    </SimpleForm>
  </Edit>
);

export default GoalEdit;
