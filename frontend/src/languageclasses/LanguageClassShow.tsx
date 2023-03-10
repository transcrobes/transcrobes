import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  BooleanField,
  Datagrid,
  FunctionField,
  ListContextProvider,
  ListControllerResult,
  ReferenceField,
  Show,
  SimpleList,
  SimpleShowLayout,
  TextField,
  useGetRecordId,
  useListController,
  useTranslate,
} from "react-admin";
import { useAppSelector } from "../app/hooks";
import { HelpShowActions } from "../components/HelpShowActions";
import { DOCS_DOMAIN, LanguageClassType, StudentRegistrationType, TeacherRegistrationType } from "../lib/types";
import RegistrationRequest from "./RegistrationRequest";

type ParticipantListProps = {
  participants: ListControllerResult<StudentRegistrationType | TeacherRegistrationType>;
  tipe: "teachers" | "students";
  canEdit: boolean;
};

function ParticipantList({ participants, tipe, canEdit }: ParticipantListProps) {
  const translate = useTranslate();
  return (
    <>
      <Typography variant="h5">{translate(`resources.languageclasses.${tipe}`)}</Typography>
      <ListContextProvider key={tipe} value={participants}>
        {canEdit ? (
          <Datagrid contentEditable={false}>
            <ReferenceField source="userId" reference="persons" link="show">
              <TextField source="email" />
            </ReferenceField>
            <BooleanField source="status" looseValue />
          </Datagrid>
        ) : (
          <SimpleList
            linkType={false}
            primaryText={
              <Box sx={{ display: "flex", gap: "1em" }}>
                <ReferenceField source="userId" reference="persons" link="show">
                  <TextField source="email" />
                </ReferenceField>
                <BooleanField source="status" looseValue />
              </Box>
            }
          />
        )}
      </ListContextProvider>
    </>
  );
}

export default function LanguageClassShow() {
  const translate = useTranslate();
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const user = useAppSelector((state) => state.userData.user);
  const classId = useGetRecordId();

  const teachers = useListController<TeacherRegistrationType>({
    queryOptions: { refetchInterval: 5000 },
    resource: "teacherregistrations",
    filter: { classId },
  });

  const students = useListController<StudentRegistrationType>({
    queryOptions: { refetchInterval: 5000 },
    resource: "studentregistrations",
    filter: { classId },
  });

  useEffect(() => {
    if (teachers.data) {
      setCanEdit(teachers.data.filter((t) => t.userId == user.id).length > 0);
    }
  }, [teachers]);

  return (
    <Show
      actions={
        <HelpShowActions
          noCreate={!user.isTeacher && !user.isAdmin}
          helpUrl={`//${DOCS_DOMAIN}/page/software/configure/languageclasses/`}
        />
      }
    >
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <BooleanField source="status" looseValue />
        <hr />
        <Typography variant="h4">{translate("resources.languageclasses.classParticipants")}</Typography>
        <FunctionField
          render={(record: LanguageClassType) =>
            record.createdBy === user.id || canEdit ? (
              <>
                <Box sx={{ display: "flex", gap: "1em" }}>
                  <RegistrationRequest tipe="student" />
                  {record.createdBy === user.id && <RegistrationRequest tipe="teacher" />}
                </Box>
                <hr />
              </>
            ) : (
              <></>
            )
          }
        />
        <FunctionField
          render={(record: LanguageClassType) =>
            teachers ? (
              <ParticipantList participants={teachers} tipe="teachers" canEdit={record.createdBy === user.id} />
            ) : (
              <></>
            )
          }
        />
        <FunctionField
          render={(record: LanguageClassType) =>
            students && (record.createdBy === user.id || canEdit) ? (
              <ParticipantList participants={students} tipe="students" canEdit={canEdit} />
            ) : (
              <></>
            )
          }
        />
      </SimpleShowLayout>
    </Show>
  );
}
