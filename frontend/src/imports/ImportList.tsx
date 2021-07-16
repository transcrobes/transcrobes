import { FC } from "react";
import {
  BooleanField,
  CreateButton,
  Datagrid,
  Filter,
  FunctionField,
  List,
  ListProps,
  SearchInput,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import { PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";

const ListActions: FC<any> = () => (
  <TopToolbar>
    {/* {cloneElement(props.filters, { context: 'button' })} */}
    <CreateButton />
    <SortButton fields={["id", "processing"]} />
  </TopToolbar>
);

const ImportFilter: FC = (props) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    {/* <TextInput label="Title" source="title" defaultValue="hello" /> */}
  </Filter>
);

export const ImportList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />} filters={<ImportFilter />}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <FunctionField
          source="processType"
          render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)}
        />
        <FunctionField
          source="processing"
          render={(record: any) => reverseEnum(PROCESSING, record.processing)}
        />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
};

export default ImportList;
