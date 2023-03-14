import { Typography } from "@mui/material";
import {
  BooleanInput,
  Create,
  FileField,
  FileInput,
  required,
  SelectInput,
  SimpleForm,
  TextInput,
  useTranslate,
} from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { DOCS_DOMAIN, IMPORTS_YT_VIDEO, MAX_IMPORT_SIZE_BYTES, PROCESS_TYPE } from "../lib/types";

export default function ImportCreate() {
  const translate = useTranslate();
  return (
    <Create
      redirect="list"
      actions={
        <HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/imports/`} ytUrl={IMPORTS_YT_VIDEO} />
      }
    >
      <SimpleForm>
        <Typography sx={{ paddingBottom: "1em" }}>
          {translate("resources.imports.create.form_description_a")}{" "}
          <Typography component={"span"} sx={{ fontWeight: "bold" }}>
            .csv, .txt, .srt / .vtt / .ass and .epub
          </Typography>{" "}
          {translate("resources.imports.create.form_description_b")}{" "}
          <a target="_blank" href={`//${DOCS_DOMAIN}/page/software/configure/imports/`}>
            {translate("buttons.general.online_help")}
          </a>{" "}
          {translate("resources.imports.create.form_description_c")}
        </Typography>

        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <BooleanInput source="shared" defaultValue={false} />
        <FileInput
          source="importFile"
          maxSize={MAX_IMPORT_SIZE_BYTES}
          accept=".txt,.csv,.epub,.vtt,.srt,.ass,.xml"
          validate={[required()]}
        >
          <FileField source="src" />
        </FileInput>
        <SelectInput
          source="processType"
          validate={[required()]}
          choices={[
            // FIXME: think about how to do this DRY
            { id: PROCESS_TYPE.VOCABULARY_ONLY, name: translate(`widgets.process_type.vocabulary_only`) },
            // { id: PROCESS_TYPE.GRAMMAR_ONLY, name: "Grammar Only" },
            // { id: PROCESS_TYPE.VOCABULARY_GRAMMAR, name: "Vocabulary and Grammar" },
          ]}
          defaultValue={PROCESS_TYPE.VOCABULARY_ONLY}
        />
      </SimpleForm>
    </Create>
  );
}
