import { Box, Typography } from "@mui/material";
import {
  BooleanField,
  Datagrid,
  ListContextProvider,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
  useGetRecordId,
  useListController,
} from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN } from "../lib/types";
import RegistrationRequest from "./RegistrationRequest";

function ParticipantList({ tipe }: { tipe: "teachers" | "students" }) {
  const participants = useListController({
    queryOptions: { refetchInterval: 5000 },
    resource: tipe == "teachers" ? "teacherregistrations" : "studentregistrations",
    filter: { classId: useGetRecordId() },
  });
  return (
    <>
      <Typography variant="h5">{tipe}</Typography>
      <ListContextProvider key={tipe} value={participants}>
        <Datagrid>
          <ReferenceField source="userId" reference="persons" link="show">
            <TextField source="email" />
          </ReferenceField>
          <BooleanField source="status" looseValue />
        </Datagrid>
      </ListContextProvider>
    </>
  );
}

export default function LanguageClassShow() {
  return (
    <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/languageclasses/`} />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <BooleanField source="status" looseValue />
        <hr />
        <Typography variant="h4">Class participants</Typography>
        <Box sx={{ display: "flex", gap: "1em" }}>
          <RegistrationRequest tipe="student" />
          <RegistrationRequest tipe="teacher" />
        </Box>
        <hr />
        <ParticipantList tipe="teachers" />
        <ParticipantList tipe="students" />
      </SimpleShowLayout>
    </Show>
  );
}
