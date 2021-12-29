import { makeStyles } from "@material-ui/core";
import { FC } from "react";
import {
  Datagrid,
  List,
  ListProps,
  SortButton,
  TextField,
  TopToolbar,
  ShowButton,
} from "react-admin";
import HelpButton from "../components/HelpButton";

import { STATUS } from "../lib/types";

const useStyles = makeStyles({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});
const ListActions: FC<any> = () => {
  const classes = useStyles();
  const helpUrl = "https://transcrob.es/page/contribute/surveys/";
  return (
    <TopToolbar className={classes.toolbar}>
      <SortButton fields={["title"]} />
      <HelpButton url={helpUrl} />
    </TopToolbar>
  );
};

export const SurveyList: FC<ListProps> = (props) => {
  return (
    <List {...props} actions={<ListActions />} filter={{ status: STATUS.ACTIVE }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ShowButton />
      </Datagrid>
    </List>
  );
};

export default SurveyList;
