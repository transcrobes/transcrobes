import { FC } from "react";
import {
  Edit,
  FieldProps,
  NumberInput,
  ReferenceInput,
  required,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
} from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { Goal } from "../lib/types";

const GoalEdit: FC<FieldProps<Goal>> = (props) => (
  <Edit actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/goals/" />} {...props}>
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="Goal name" source="title" validate={[required()]} />
      <TextInput label="Goal description" multiline source="description" />
      <NumberInput max={10} min={1} source="priority" step={1} />
      <ReferenceInput
        sort={{ field: "title", order: "ASC" }}
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
