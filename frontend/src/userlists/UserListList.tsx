import {
  BooleanField,
  CreateButton,
  Datagrid,
  FunctionField,
  List,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { PROCESSING, reverseEnum } from "../lib/types";

function ListActions() {
  return (
    <TopToolbar>
      {/* {cloneElement(props.filters, { context: 'button' })} */}
      <CreateButton />
      <SortButton fields={["createdAt", "title", "processing"]} />
      <HelpButton url="https://transcrob.es/page/software/configure/wordlists/" />
    </TopToolbar>
  );
}

export default function UserListList() {
  return (
    <List actions={<ListActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <FunctionField source="processing" render={(record: any) => reverseEnum(PROCESSING, record.processing)} />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
}
