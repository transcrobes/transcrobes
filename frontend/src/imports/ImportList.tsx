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
import { ListEmpty } from "../components/ListEmpty";
import { ProcessingField } from "../components/ProcessingField";
import { DOCS_DOMAIN, PROCESS_TYPE, reverseEnum } from "../lib/types";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title", "processing"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/imports/`} />
    </TopToolbar>
  );
}

export default function ImportList() {
  return (
    <List
      empty={<ListEmpty actions={<ListActions empty />} />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <FunctionField source="processType" render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)} />
        <ProcessingField label="Processing status" />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
}
