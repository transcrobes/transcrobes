import { Typography } from "@mui/material";
import { BooleanInput, Create, FileField, FileInput, required, SelectInput, SimpleForm, TextInput } from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN, MAX_IMPORT_SIZE_BYTES, PROCESS_TYPE } from "../lib/types";

export default function ImportCreate() {
  return (
    <Create
      redirect="list"
      actions={<HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/imports/`} />}
    >
      <SimpleForm>
        <Typography sx={{ paddingBottom: "1em" }}>
          Please check the{" "}
          <a target="_blank" href={`//${DOCS_DOMAIN}/page/software/configure/imports/`}>
            Online Help
          </a>{" "}
          for information about supported import formats!
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
          validate={[required()]}
          choices={[
            // FIXME: think about how to do this DRY
            { id: PROCESS_TYPE.VOCABULARY_ONLY, name: "Vocabulary Only" },
            // { id: PROCESS_TYPE.GRAMMAR_ONLY, name: "Grammar Only" },
            // { id: PROCESS_TYPE.VOCABULARY_GRAMMAR, name: "Vocabulary and Grammar" },
          ]}
          defaultValue={PROCESS_TYPE.VOCABULARY_ONLY}
        />
      </SimpleForm>
    </Create>
  );
}
