import { CreateButton, Datagrid, List as RAList, ListProps, SortButton, TextField, TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";

function ListActions() {
  return (
    <TopToolbar>
      <CreateButton />
      <SortButton fields={["updatedAt", "title"]} />
      <HelpButton url="https://transcrob.es/page/software/configure/userdictionaries/" />
    </TopToolbar>
  );
}

export default function List(props: ListProps) {
  return (
    <RAList {...props} actions={<ListActions />} sort={{ field: "updatedAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
      </Datagrid>
    </RAList>
  );
}
