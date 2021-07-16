import * as React from "react";
import { FC } from "react";
import {
  Datagrid,
  Button,
  List,
  ListProps,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
} from "react-admin";

const ListActions: FC<any> = (props) => (
  <TopToolbar>
    {/* {cloneElement(props.filters, { context: 'button' })} */}
    <SortButton fields={["title"]} />
  </TopToolbar>
);

export const SurveyList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />}>
      <Datagrid rowClick="show">
        {/* <TextField source="id" /> */}
        <TextField source="title" />
        <ReferenceField source="userList" reference="userlists">
          <TextField source="title" />
        </ReferenceField>
        <Button label="Answer" />
      </Datagrid>
    </List>
  );
};

export default SurveyList;
