import { FC } from "react";
import { Datagrid, Button, List, ListProps, SortButton, TextField, TopToolbar } from "react-admin";

import { STATUS } from "../lib/types";

const ListActions: FC<any> = (props) => (
  <TopToolbar>
    {/* {cloneElement(props.filters, { context: 'button' })} */}
    <SortButton fields={["title"]} />
  </TopToolbar>
);

export const SurveyList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />} filter={{ status: STATUS.ACTIVE }}>
      <Datagrid rowClick="show">
        {/* <TextField source="id" /> */}
        <TextField source="title" />
        <Button label="Answer" />
      </Datagrid>
    </List>
  );
};

export default SurveyList;
