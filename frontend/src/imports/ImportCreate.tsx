import { Typography } from "@mui/material";
import { BooleanInput, Create, FileField, FileInput, required, SelectInput, SimpleForm, TextInput } from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN, IMPORTS_YT_VIDEO, MAX_IMPORT_SIZE_BYTES, PROCESS_TYPE } from "../lib/types";

export default function ImportCreate() {
  return (
    <Create
      redirect="list"
      actions={
        <HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/imports/`} ytUrl={IMPORTS_YT_VIDEO} />
      }
    >
      <SimpleForm>
        <Typography sx={{ paddingBottom: "1em" }}>
          You can import{" "}
          <Typography component={"span"} sx={{ fontWeight: "bold" }}>
            .csv, .txt, .srt / .vtt and .epub
          </Typography>{" "}
          files. Please check the dedicated{" "}
          <a target="_blank" href={`//${DOCS_DOMAIN}/page/software/configure/imports/`}>
            Online Help
          </a>{" "}
          for more information about supported import formats!
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
