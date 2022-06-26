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
import { GRADE, KNOWLEDGE_UNSET } from "../database/Schema";
import { DOCS_DOMAIN, PROCESSING, STATUS } from "../lib/types";

export default function UserListCreate() {
  return (
    <Create
      redirect="list"
      actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/wordlists/`} />}
    >
      <SimpleForm>
        <TextInput label="List name" source="title" validate={[required()]} />
        <TextInput label="List description" multiline source="description" />
        <NumberInput min={-1} source="nbToTake" step={1} defaultValue={-1} />
        <ReferenceInput
          sort={{ field: "title", order: "ASC" }}
          label="Source Import"
          source="theImport"
          reference="imports"
          filter={{ status: STATUS.ACTIVE, processing: PROCESSING.FINISHED }}
        >
          <SelectInput validate={[required()]} optionText="title" />
        </ReferenceInput>
        {/* <BooleanInput label="Only dictionary words" source="onlyDictionaryWords" defaultValue={true} /> */}
        <NumberInput label="Minimum absolute freq." min={-1} source="minimumAbsFrequency" step={1} defaultValue={-1} />
        <NumberInput label="Minimum document freq." min={-1} source="minimumDocFrequency" step={1} defaultValue={-1} />
        <SelectInput
          label="Order by"
          source="orderBy"
          validate={[required()]}
          choices={[
            { id: 0, name: "Absolute Frequency" },
            { id: 1, name: "Import Frequency" },
          ]}
          defaultValue={0}
        />
        <SelectInput
          label="Set word knowledge"
          source="wordKnowledge"
          validate={[required()]}
          choices={[
            { id: KNOWLEDGE_UNSET, name: "Don't set" },
            { id: GRADE.UNKNOWN, name: "Unknown" },
            { id: GRADE.HARD, name: "Hard" },
            { id: GRADE.GOOD, name: "Good" },
            { id: GRADE.KNOWN, name: "Known" },
          ]}
          defaultValue={KNOWLEDGE_UNSET}
        />
        <BooleanInput label="Shared with others" source="shared" defaultValue={false} />
      </SimpleForm>
    </Create>
  );
}
