import { makeStyles } from "tss-react/mui";
import { Datagrid, List, SortButton, TextField, TopToolbar, ShowButton } from "react-admin";
import HelpButton from "../components/HelpButton";

import { DOCS_DOMAIN, STATUS } from "../lib/types";

const useStyles = makeStyles()({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});
export function ListActions() {
  const { classes } = useStyles();
  const helpUrl = `//${DOCS_DOMAIN}/page/contribute/surveys/`;
  return (
    <TopToolbar className={classes.toolbar}>
      <SortButton fields={["title"]} />
      <HelpButton url={helpUrl} />
    </TopToolbar>
  );
}

export default function SurveyList() {
  return (
    <List
      actions={<ListActions />}
      filter={{ status: STATUS.ACTIVE }}
      queryOptions={{ refetchInterval: 5000, cacheTime: 0 }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ShowButton />
      </Datagrid>
    </List>
  );
}
