import { CreateButton, Datagrid, List as RAList, SortButton, TextField, TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { DOCS_DOMAIN } from "../lib/types";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/userdictionaries/`} />
    </TopToolbar>
  );
}

export default function List() {
  return (
    <RAList
      empty={<ListEmpty actions={<ListActions empty />} />}
      actions={<ListActions />}
      sort={{ field: "updatedAt", order: "DESC" }}
      queryOptions={{ refetchInterval: 5000, cacheTime: 0 }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
      </Datagrid>
    </RAList>
  );
}
