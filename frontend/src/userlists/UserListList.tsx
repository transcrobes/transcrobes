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
} from "react-admin";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { ProcessingField } from "../components/ProcessingField";
import { PROCESSING } from "../lib/types";

function ListActions({ empty, createDisabled }: { empty?: boolean; createDisabled?: boolean }) {
  return (
    <TopToolbar>
      {!empty && !createDisabled && <CreateButton />}
      {!empty && <SortButton fields={["createdAt", "title", "processing"]} />}
      <HelpButton url="https://transcrob.es/page/software/configure/wordlists/" />
    </TopToolbar>
  );
}

function EmtpyList() {
  const { data, isLoading } = useGetList("imports", {
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
          Lists are created from <Link to="/imports">imports</Link>. You first need to{" "}
          <Link to="/imports">create an import</Link>, then return here.
        </Typography>
      )}
    </ListEmpty>
  );
}

export default function UserListList() {
  return (
    <List empty={<EmtpyList />} actions={<ListActions />} sort={{ field: "createdAt", order: "DESC" }}>
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ProcessingField label="Processing status" />
        <BooleanField source="shared" sortable={false} />
      </Datagrid>
    </List>
  );
}
