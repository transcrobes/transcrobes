import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  required,
  SelectInput,
  SimpleForm,
  TextInput,
  useTranslate,
} from "react-admin";
import { HelpCreateActions } from "../components/HelpCreateActions";
import { GRADE, KNOWLEDGE_UNSET } from "../database/Schema";
import { DOCS_DOMAIN, PROCESSING, STATUS, USERLISTS_YT_VIDEO } from "../lib/types";

export default function UserListCreate() {
  const translate = useTranslate();
  return (
    <Create
      redirect="list"
      actions={
        <HelpCreateActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/wordlists/`} ytUrl={USERLISTS_YT_VIDEO} />
      }
    >
      <SimpleForm>
        <TextInput source="title" validate={[required()]} />
        <TextInput multiline source="description" />
        <NumberInput min={-1} source="nbToTake" step={1} defaultValue={-1} />
        <ReferenceInput
          sort={{ field: "title", order: "ASC" }}
          source="theImport"
          reference="imports"
          filter={{ status: STATUS.ACTIVE, processing: PROCESSING.FINISHED }}
        >
          <SelectInput validate={[required()]} optionText="title" />
        </ReferenceInput>
        {/* <BooleanInput label="Only dictionary words" source="onlyDictionaryWords" defaultValue={true} /> */}
        <NumberInput min={-1} source="minimumAbsFrequency" step={1} defaultValue={-1} />
        <NumberInput min={-1} source="minimumDocFrequency" step={1} defaultValue={-1} />
        <SelectInput
          source="orderBy"
          validate={[required()]}
          choices={[
            { id: 0, name: translate("widgets.order_by.absolute_frequency") },
            { id: 1, name: translate("widgets.order_by.import_frequency") },
          ]}
          defaultValue={0}
        />
        <SelectInput
          source="wordKnowledge"
          validate={[required()]}
          choices={[
            { id: KNOWLEDGE_UNSET, name: translate("widgets.set_knowledge.dont_set") },
            { id: GRADE.UNKNOWN, name: translate("widgets.set_knowledge.unknown") },
            { id: GRADE.HARD, name: translate("widgets.set_knowledge.hard") },
            { id: GRADE.GOOD, name: translate("widgets.set_knowledge.good") },
            { id: GRADE.KNOWN, name: translate("widgets.set_knowledge.known") },
          ]}
          defaultValue={KNOWLEDGE_UNSET}
        />
        <BooleanInput source="shared" defaultValue={false} />
      </SimpleForm>
    </Create>
  );
}
