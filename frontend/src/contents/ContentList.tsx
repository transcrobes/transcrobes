import { Datagrid, FunctionField, List, ReferenceField, SortButton, TextField, TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { CONTENT_TYPE, PROCESSING, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";

function ContentActions() {
  return (
    <TopToolbar>
      <SortButton fields={["createdAt", "title", "processing"]} />
      <HelpButton url="https://transcrob.es/page/software/configure/contents/" />
    </TopToolbar>
  );
}
export default function ContentList() {
  return (
    <List actions={<ContentActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <FunctionField source="processing" render={(record: any) => reverseEnum(PROCESSING, record.processing)} />
        <FunctionField source="contentType" render={(record: any) => reverseEnum(CONTENT_TYPE, record.contentType)} />
        <ActionButton label="Action" />
        <CacheSwitch label="Offline?" />
      </Datagrid>
    </List>
  );
}
