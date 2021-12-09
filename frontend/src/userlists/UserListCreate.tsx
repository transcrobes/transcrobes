import { FC } from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  required,
  FieldProps,
  BooleanInput,
  SelectInput,
  NumberInput,
  ReferenceInput,
} from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";

import { UserList, STATUS, PROCESSING } from "../lib/types";

const UserListCreate: FC<FieldProps<UserList>> = (props) => (
  <Create
    actions={
      <HelpCreateActions helpUrl="https://transcrob.es/page/software/configure/wordlists/" />
    }
    {...props}
  >
    <SimpleForm redirect="list">
      <TextInput label="List name" source="title" validate={[required()]} />
      <TextInput label="List description" multiline source="description" />
      <NumberInput min={-1} source="nbToTake" step={1} defaultValue={-1} />
      <ReferenceInput
        sort={{ field: "title", order: "ASC" }}
        label="Source Import"
        source="theImport"
        reference="imports"
        validate={[required()]}
        filter={{ status: STATUS.ACTIVE, processing: PROCESSING.FINISHED }}
      >
        <SelectInput allowEmpty={false} optionText="title" />
      </ReferenceInput>
      {/* <BooleanInput label="Only dictionary words" source="onlyDictionaryWords" defaultValue={true} /> */}
      <NumberInput
        label="Minimum absolute freq."
        min={-1}
        source="minimumAbsFrequency"
        step={1}
        defaultValue={-1}
      />
      <NumberInput
        label="Minimum document freq."
        min={-1}
        source="minimumDocFrequency"
        step={1}
        defaultValue={-1}
      />
      <SelectInput
        label="Ordery by"
        source="orderBy"
        choices={[
          { id: 0, name: "Absolute Frequency" },
          { id: 1, name: "Import Frequency" },
        ]}
        initialValue={0}
      />
      <BooleanInput label="Words are known" source="wordsAreKnown" defaultValue={false} />
      <BooleanInput label="Shared with others" source="shared" defaultValue={false} />
    </SimpleForm>
  </Create>
);

export default UserListCreate;
