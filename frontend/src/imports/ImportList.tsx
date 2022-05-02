import {
  BooleanField,
  CreateButton,
  Datagrid,
  FunctionField,
  List,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";

function ListActions() {
  return (
    <TopToolbar>
      <CreateButton />
      <SortButton fields={["createdAt", "title", "processing"]} />
      <HelpButton url="https://transcrob.es/page/software/configure/imports/" />
    </TopToolbar>
  );
}

export default function ImportList() {
  return (
    <List actions={<ListActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <FunctionField source="processType" render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)} />
        <FunctionField source="processing" render={(record: any) => reverseEnum(PROCESSING, record.processing)} />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
}
