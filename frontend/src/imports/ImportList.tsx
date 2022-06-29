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
import { ContentStatsField } from "../components/ContentStatsField";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { ProcessingField } from "../components/ProcessingField";
import WatchDemo from "../components/WatchDemo";
import { DOCS_DOMAIN, IMPORTS_YT_VIDEO, PROCESS_TYPE, reverseEnum } from "../lib/types";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title", "processing"]} />}
      <WatchDemo url={IMPORTS_YT_VIDEO} />
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/imports/`} />
    </TopToolbar>
  );
}

export default function ImportList() {
  return (
    <List
      queryOptions={{ refetchInterval: 5000 }}
      empty={<ListEmpty actions={<ListActions empty />} />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <FunctionField source="processType" render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)} />
        <ContentStatsField label="Content Stats" />
        <ProcessingField label="Processing status" />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
}
