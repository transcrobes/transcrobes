import { FC } from "react";

import {
  BooleanField,
  CreateButton,
  Datagrid,
  Filter,
  FunctionField,
  List,
  ListProps,
  ReferenceField,
  SearchInput,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import { PROCESSING, reverseEnum } from "../lib/types";

const ListActions: FC<any> = () => (
  <TopToolbar>
    {/* {cloneElement(props.filters, { context: 'button' })} */}
    <CreateButton />
    <SortButton fields={["id", "processing"]} />
  </TopToolbar>
);

const UserListFilter: FC = (props) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    {/* <TextInput label="Title" source="title" defaultValue="hello" /> */}
  </Filter>
);

export const UserListList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />} filters={<UserListFilter />}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <FunctionField
          source="processing"
          render={(record: any) => reverseEnum(PROCESSING, record.processing)}
        />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
};

export default UserListList;
