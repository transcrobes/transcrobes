import { FC } from "react";
import {
  CreateButton,
  Datagrid,
  Filter,
  List,
  ListProps,
  ReferenceField,
  SearchInput,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";

const ListActions: FC<any> = (props) => (
  <TopToolbar>
    {/* {cloneElement(props.filters, { context: 'button' })} */}
    <CreateButton />
    <SortButton fields={["id"]} />
  </TopToolbar>
);

const GoalFilter: FC = (props) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    {/* <TextInput label="Title" source="title" defaultValue="hello" /> */}
  </Filter>
);

export const GoalList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />} filters={<GoalFilter />}>
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
