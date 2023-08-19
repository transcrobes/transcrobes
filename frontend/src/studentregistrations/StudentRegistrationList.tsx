import { Typography } from "@mui/material";
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
import { useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { DOCS_DOMAIN } from "../lib/types";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar>
      {!empty && <SortButton fields={["createdAt", "title"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/studentregistrations/`} />
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
        {translate("resources.studentregistrations.empty_list")}
      </Typography>
    </ListEmpty>
  );
}

export default function StudentRegistrationList() {
  const userId = useAppSelector((state) => state.userData.user.id);
  return (
    <List
      hasCreate={false}
      queryOptions={{ meta: { filteredAsAll: true }, refetchInterval: 5000, cacheTime: 0 }}
      empty={<EmptyList />}
      actions={<ListActions />}
      filter={{ userId }}
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
