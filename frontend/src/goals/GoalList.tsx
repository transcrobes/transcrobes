import { CreateButton, Datagrid, List, ReferenceField, SortButton, TextField, TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";

function ListActions() {
  return (
    <TopToolbar>
      <CreateButton />
      <SortButton fields={["createdAt", "title"]} />
      <HelpButton url="https://transcrob.es/page/software/configure/goals/" />
    </TopToolbar>
  );
}

export default function GoalList() {
  return (
    <List actions={<ListActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField source="userList" reference="userlists" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ReferenceField source="parent" reference="goals" sortable={false} link="show">
          <TextField source="title" />
        </ReferenceField>
        <TextField source="priority" />
      </Datagrid>
    </List>
  );
}
