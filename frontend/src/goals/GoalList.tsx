import { Typography } from "@mui/material";
import {
  BooleanField,
  CreateButton,
  Datagrid,
  Link,
  List,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
  useGetList,
  useTranslate,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { DOCS_DOMAIN, PROCESSING } from "../lib/types";
import { WordlistField } from "./WordlistField";

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
  const translate = useTranslate();
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
          {translate("resources.goals.no_goals_message_a")}
          <Link to="/userlists">{translate("resources.goals.no_goals_message_b")}</Link>.{" "}
          {translate("resources.goals.no_goals_message_c")}{" "}
          <Link to="/userlists">{translate("resources.goals.no_goals_message_d")}</Link>
          {translate("resources.goals.no_goals_message_e")}
        </Typography>
      )}
    </ListEmpty>
  );
}

export default function GoalList() {
  return (
    <List
      empty={<EmtpyList />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
      queryOptions={{ refetchInterval: 5000, cacheTime: 0 }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <WordlistField label="List" />
        <ReferenceField source="parent" reference="goals" sortable={false} link="show">
          <TextField source="title" />
        </ReferenceField>
        <BooleanField source="status" looseValue />
        <TextField source="priority" />
      </Datagrid>
    </List>
  );
}
