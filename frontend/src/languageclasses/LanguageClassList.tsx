import { BooleanField, CreateButton, Datagrid, List, SortButton, TextField, TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { DOCS_DOMAIN } from "../lib/types";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title"]} />}
      {/* <WatchDemo url={IMPORTS_YT_VIDEO} /> */}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/languageclasses/`} />
    </TopToolbar>
  );
}

export default function LanguageClassList() {
  return (
    <List
      queryOptions={{ refetchInterval: 5000 }}
      empty={<ListEmpty actions={<ListActions empty />} />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <BooleanField source="status" looseValue />
      </Datagrid>
    </List>
  );
}
