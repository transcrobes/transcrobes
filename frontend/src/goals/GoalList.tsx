import { FC } from "react";
import {
  CreateButton,
  Datagrid,
  List,
  ListProps,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import HelpButton from "../components/HelpButton";

const ListActions: FC<any> = () => (
  <TopToolbar>
    <CreateButton />
    <SortButton fields={["createdAt", "title"]} />
    <HelpButton url="https://transcrob.es/page/software/configure/goals/" />
  </TopToolbar>
);

export const GoalList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />} sort={{ field: "createdAt", order: "DESC" }}>
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
};

export default GoalList;
