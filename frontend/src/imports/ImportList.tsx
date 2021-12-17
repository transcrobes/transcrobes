import { FC } from "react";
import {
  BooleanField,
  CreateButton,
  Datagrid,
  FunctionField,
  List,
  ListProps,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";

const ListActions: FC<any> = () => (
  <TopToolbar>
    <CreateButton />
    <SortButton fields={["id", "processing"]} />
    <HelpButton url="https://transcrob.es/page/software/configure/imports/" />
  </TopToolbar>
);

export const ImportList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />}>
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
