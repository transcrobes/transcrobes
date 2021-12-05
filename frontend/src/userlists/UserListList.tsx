import { Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { FC } from "react";
import {
  BooleanField,
  CreateButton,
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
import { PROCESSING, reverseEnum } from "../lib/types";

const useStyles = makeStyles({
  // toolbar: { paddingTop: "0" },
  toolbar: {},
});

const ListActions: FC<any> = () => {
  const classes = useStyles();
  return (
    <TopToolbar className={classes.toolbar}>
      {/* {cloneElement(props.filters, { context: 'button' })} */}
      <CreateButton />
      <SortButton fields={["id", "processing"]} />
      <HelpButton url="https://transcrob.es/page/software/configure/wordlists/" />
    </TopToolbar>
  );
};

export const UserListList: FC<ListProps> = (props) => {
  return (
    <>
      <List {...props} actions={<ListActions />}>
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
    </>
  );
};

export default UserListList;
