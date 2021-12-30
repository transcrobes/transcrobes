import { Typography } from "@material-ui/core";
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
import { HelpCreateActions } from "../components/HelpCreateActions";

import { Import, PROCESS_TYPE } from "../lib/types";

const MAX_IMPORT_SIZE_BYTES = 15000000;

const ImportCreate: FC<FieldProps<Import>> = (props) => (
  <Create
    actions={<HelpCreateActions helpUrl="https://transcrob.es/page/software/configure/imports/" />}
    {...props}
  >
    <SimpleForm redirect="list">
      <Typography>
        Please check the{" "}
        <a href="https://transcrob.es/page/software/configure/imports/">Online Help</a> for
        information about supported import formats!
      </Typography>

      <TextInput label="Import name" source="title" validate={[required()]} />
      <TextInput label="Import description" multiline source="description" />
      <BooleanInput label="Shared with others" source="shared" defaultValue={false} />
      <FileInput
        source="importFile"
        maxSize={MAX_IMPORT_SIZE_BYTES}
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
          // { id: PROCESS_TYPE.GRAMMAR_ONLY, name: "Grammar Only" },
          // { id: PROCESS_TYPE.VOCABULARY_GRAMMAR, name: "Vocabulary and Grammar" },
        ]}
        initialValue={PROCESS_TYPE.VOCABULARY_ONLY}
      />
    </SimpleForm>
  </Create>
);

export default ImportCreate;
