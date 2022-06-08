import { CreateButton, Datagrid, List as RAList, SortButton, TextField, TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title"]} />}
      <HelpButton url="https://transcrob.es/page/software/configure/userdictionaries/" />
    </TopToolbar>
  );
}

export default function List() {
  return (
    <RAList
      empty={<ListEmpty actions={<ListActions empty />} />}
      actions={<ListActions />}
      sort={{ field: "updatedAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
      </Datagrid>
    </RAList>
  );
}
