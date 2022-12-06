import {
  BooleanField,
  Datagrid,
  List,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
  useTranslate,
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { DOCS_DOMAIN } from "../lib/types";
import { Typography } from "@mui/material";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <SortButton fields={["createdAt", "title"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/teacherregistrations/`} />
    </TopToolbar>
  );
}

function EmptyList() {
  const translate = useTranslate();
  return (
    <ListEmpty createDisabled actions={<ListActions empty />}>
      <Typography
        sx={{
          fontSize: "1.5rem",
          textAlign: "center",
        }}
        variant="body1"
      >
        {translate("resources.teacherregistrations.empty_list")}
      </Typography>
    </ListEmpty>
  );
}

export default function TeacherRegistrationList() {
  return (
    <List
      hasCreate={false}
      queryOptions={{ meta: { filteredAsAll: true } }}
      empty={<EmptyList />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <ReferenceField source="classId" reference="languageclasses" link="show">
          <TextField source="title" />
        </ReferenceField>
        <BooleanField source="status" looseValue />
      </Datagrid>
    </List>
  );
}
