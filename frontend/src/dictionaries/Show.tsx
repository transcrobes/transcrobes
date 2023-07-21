import { Show, SimpleShowLayout, TextField } from "react-admin";
import { useParams } from "react-router-dom";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN } from "../lib/types";
import ImportNew from "./Import";
import { platformHelper } from "../app/createStore";

export default function AShow() {
  const { id } = useParams();
  return (
    <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/userdictionaries/`} />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ImportNew dictionaryId={id || ""} proxy={platformHelper} />
      </SimpleShowLayout>
    </Show>
  );
}
