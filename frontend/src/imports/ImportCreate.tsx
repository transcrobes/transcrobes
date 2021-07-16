import { FC } from "react";
import {
  Create,
  SimpleForm,
  TextInput,
  required,
  FieldProps,
  BooleanInput,
  FileInput,
  SelectInput,
  FileField,
} from "react-admin";

import { Import, PROCESS_TYPE } from "../lib/types";

const ImportCreate: FC<FieldProps<Import>> = (props) => (
  <Create {...props}>
    <SimpleForm redirect="list">
      <TextInput label="Import name" source="title" validate={[required()]} />
      <TextInput label="Import description" multiline source="description" />
      <BooleanInput label="Shared with others" source="shared" defaultValue={false} />
      <FileInput
        source="importFile"
        maxSize={5000000}
        accept=".txt,.csv,.epub,.vtt,.srt"
        validate={[required()]}
      >
        <FileField source="src" title="title" />
      </FileInput>
      <SelectInput
        label="Processing type"
        source="processType"
        choices={[
          // FIXME: think about how to do this DRY
          { id: PROCESS_TYPE.VOCABULARY_ONLY, name: "Vocabulary Only" },
          { id: PROCESS_TYPE.GRAMMAR_ONLY, name: "Grammar Only" },
          { id: PROCESS_TYPE.VOCABULARY_GRAMMAR, name: "Vocabulary and Grammar" },
        ]}
        initialValue={PROCESS_TYPE.VOCABULARY_ONLY}
      />
    </SimpleForm>
  </Create>
);

export default ImportCreate;
