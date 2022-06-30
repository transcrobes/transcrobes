import { Typography } from "@mui/material";
import {
  CreateButton,
  Datagrid,
  Link,
  List,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
  useGetList,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { DOCS_DOMAIN, PROCESSING } from "../lib/types";

function ListActions({ empty, createDisabled }: { empty?: boolean; createDisabled?: boolean }) {
  return (
    <TopToolbar>
      {!empty && !createDisabled && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/goals/`} />
    </TopToolbar>
  );
}

function EmtpyList() {
  const { data, isLoading } = useGetList("userlists", {
    pagination: { page: 1, perPage: 1 },
    filter: { processing: PROCESSING.FINISHED },
  });
  // WARNING, total is WRONG with our driver, so use data instead
  const disableCreate = isLoading || (data || []).length < 1;
  return (
    <ListEmpty createDisabled={disableCreate} actions={<ListActions empty createDisabled={disableCreate} />}>
      {data !== undefined && data.length < 1 && (
        <Typography
          sx={{
            fontSize: "1.5rem",
            textAlign: "center",
          }}
          variant="body1"
        >
          Goals are created from <Link to="/userlists">lists</Link>. You first need to{" "}
          <Link to="/userlists">create a list</Link>, then return here.
        </Typography>
      )}
    </ListEmpty>
  );
}

export default function GoalList() {
  return (
    <List empty={<EmtpyList />} actions={<ListActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField source="userList" reference="wordlists" link={false}>
          <TextField source="name" />
        </ReferenceField>
        <ReferenceField source="parent" reference="goals" sortable={false} link="show">
          <TextField source="title" />
        </ReferenceField>
        <TextField source="priority" />
      </Datagrid>
    </List>
  );
}
