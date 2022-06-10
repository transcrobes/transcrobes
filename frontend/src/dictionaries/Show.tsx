import { Show, SimpleShowLayout, TextField, useRecordContext } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN } from "../lib/types";
import ImportNew from "./Import";

export default function AShow() {
  const record = useRecordContext();
  return (
    <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/userdictionaries/`} />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ImportNew dictionaryId={record.id.toString()} proxy={window.componentsConfig.proxy} />
      </SimpleShowLayout>
    </Show>
  );
}
