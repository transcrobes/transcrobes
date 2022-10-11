import {
  BooleanField,
  CreateButton,
  Datagrid,
  FunctionField,
  List,
  SortButton,
  TextField,
  TopToolbar,
  useTranslate,
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
  const translate = useTranslate();
  return (
    <List
      queryOptions={{ refetchInterval: 5000 }}
      empty={<ListEmpty actions={<ListActions empty />} />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <FunctionField
          source="processType"
          render={(record: any) => translate(`widgets.process_type.${PROCESS_TYPE[record.processType].toLowerCase()}`)}
        />
        <ContentStatsField label={translate("resources.imports.contentStats")} />
        <ProcessingField label={translate("resources.imports.processingStatus")} />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
}
