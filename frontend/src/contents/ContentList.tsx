import * as React from "react";
import { FC } from "react";
import {
  BooleanField,
  Datagrid,
  EditButton,
  FunctionField,
  List,
  ListProps,
  ReferenceField,
  ShowButton,
  TextField,
  TopToolbar,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { CONTENT_TYPE, PROCESSING, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";

const ContentActions: FC<any> = () => (
  <TopToolbar>
    <HelpButton url="https://transcrob.es/page/software/configure/contents/" />
  </TopToolbar>
);

// const ContentFilter: FC = (props) => (
//   <Filter {...props}>
//     <SearchInput source="q" alwaysOn />
//   </Filter>
// );

//

export const ContentList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ContentActions />}>
      <Datagrid>
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <FunctionField
          source="processing"
          render={(record: any) => reverseEnum(PROCESSING, record.processing)}
        />
        <FunctionField
          source="contentType"
          render={(record: any) => reverseEnum(CONTENT_TYPE, record.contentType)}
        />
        <BooleanField source="shared" />
        <ActionButton label="Action" props={props} />
        <EditButton />
        <ShowButton />
      </Datagrid>
    </List>
  );
};

export default ContentList;
