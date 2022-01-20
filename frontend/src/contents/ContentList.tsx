import { FC } from "react";
import {
  Datagrid,
  FunctionField,
  List,
  ListProps,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { CONTENT_TYPE, PROCESSING, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";

const ContentActions: FC<any> = () => (
  <TopToolbar>
    <SortButton fields={["createdAt", "title", "processing"]} />
    <HelpButton url="https://transcrob.es/page/software/configure/contents/" />
  </TopToolbar>
);

export const ContentList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ContentActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <FunctionField source="processing" render={(record: any) => reverseEnum(PROCESSING, record.processing)} />
        <FunctionField source="contentType" render={(record: any) => reverseEnum(CONTENT_TYPE, record.contentType)} />
        <ActionButton label="Action" props={props} />
        <CacheSwitch label="Offline?" props={props} />
      </Datagrid>
    </List>
  );
};

export default ContentList;
