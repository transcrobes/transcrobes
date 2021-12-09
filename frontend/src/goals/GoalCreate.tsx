import { FC } from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  required,
  FieldProps,
  SelectInput,
  NumberInput,
  ReferenceInput,
} from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";

import { Goal, PROCESSING, STATUS } from "../lib/types";

const GoalCreate: FC<FieldProps<Goal>> = (props) => (
  <Create
    actions={<HelpCreateActions helpUrl="https://transcrob.es/page/software/configure/goals/" />}
    {...props}
  >
    <SimpleForm redirect="list">
      <TextInput label="Goal name" source="title" validate={[required()]} />
      <TextInput label="Goal description" multiline source="description" />
      <NumberInput max={10} min={1} source="priority" step={1} />
      <ReferenceInput
        sort={{ field: "title", order: "ASC" }}
        label="User list"
        source="userList"
        validate={[required()]}
        reference="userlists"
        filter={{ status: STATUS.ACTIVE, processing: PROCESSING.FINISHED }}
      >
        <SelectInput allowEmpty={false} optionText="title" />
      </ReferenceInput>
      <ReferenceInput label="Parent" source="parent" reference="goals">
        <SelectInput allowEmpty={true} optionText="title" />
      </ReferenceInput>
    </SimpleForm>
  </Create>
);

// export interface Goal extends Record {
//   // fields = ["url", "id", "user", "title", "description", "user_list", "parent", "priority"]
//   user: Identifier;
//   title: string;
//   description: string;
//   user_list: Identifier;
//   parent: Identifier;
//   priority: number;
// }

export default GoalCreate;
