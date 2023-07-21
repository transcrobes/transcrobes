import { FormControl, FormHelperText, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { LanguageClassType, PersonType, StudentRegistrationType, TeacherRegistrationType } from "../lib/types";
import { platformHelper } from "../app/createStore";

type StudentSelectorProps = {
  onChange: (event: SelectChangeEvent) => void;
  classId: string;
};
function PersonSelector({ classId, onChange }: StudentSelectorProps) {
  const [students, setStudents] = useState<PersonType[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);

  function onLocalChange(event: SelectChangeEvent) {
    setStudentId(event.target.value);
    if (onChange) {
      onChange(event);
    }
  }

  const translate = useTranslate();
  useEffect(() => {
    console.log("starting the effect", classId, studentId);
    setStudentId(undefined);
    (async function () {
      const [registrations, persons] = await Promise.all([
        platformHelper.getAllFromDB({ collection: "studentregistrations" }),
        platformHelper.getAllFromDB({ collection: "persons" }),
      ]);
      const classStudents = new Set<string>(
        registrations?.filter((r) => r.classId === classId && r.status).map((r) => r.userId) || [],
      );
      const studs = persons?.filter((c) => classStudents.has(c.id.toLocaleString())) || [];

      if (studs && studs.length > 0) {
        setStudents(studs);
      }
    })();
  }, [classId]);

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} size={"medium"}>
      <InputLabel id="select-person-label">{translate("screens.studentstats.students")}</InputLabel>
      <Select
        labelId="select-person-label"
        id="select-person"
        value={studentId || ""}
        label={translate("screens.studentstats.students")}
        onChange={onLocalChange}
      >
        <MenuItem key={""} value="">
          <em>{translate("screens.studentstats.no_student")}</em>
        </MenuItem>
        {students.map((student) => (
          <MenuItem key={student.id} value={student.id}>
            {student.fullName || student.email}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{translate("screens.studentstats.student_selector")}</FormHelperText>
    </FormControl>
  );
}

export function StudentSelector({ onChange }: { onChange: (event: SelectChangeEvent) => void }) {
  const translate = useTranslate();
  const [classes, setClasses] = useState<LanguageClassType[]>([]);
  const [classId, setClassId] = useState<string | undefined>(undefined);

  function onLocalChange(event: SelectChangeEvent) {
    setClassId(event.target.value);
  }

  useEffect(() => {
    (async function () {
      const [classes, teachers] = await Promise.all([
        platformHelper.getAllFromDB({ collection: "languageclasses" }),
        platformHelper.getAllFromDB({ collection: "teacherregistrations" }),
      ]);
      const taughtClasses = new Set<string>(teachers?.map((t) => t.classId) || []);
      const existing = classes?.filter((c) => c.status && taughtClasses.has(c.id.toLocaleString())) || [];

      if (existing && existing.length > 0) {
        setClasses(existing);
      }
    })();
  }, []);

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <FormControl sx={{ m: 1, minWidth: 120 }} size={"medium"}>
        <InputLabel id="select-userlist-label">{translate("screens.studentstats.classes")}</InputLabel>
        <Select
          labelId="select-userlist-label"
          id="select-class"
          value={classId || ""}
          label={translate("screens.studentstats.classes")}
          onChange={onLocalChange}
        >
          <MenuItem key={""} value="">
            <em>{translate("screens.studentstats.no_class")}</em>
          </MenuItem>
          {classes.map((langClass) => (
            <MenuItem key={langClass.id} value={langClass.id}>
              {langClass.title}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{translate("screens.studentstats.class_selector")}</FormHelperText>
      </FormControl>
      {classId ? <PersonSelector key={classId} classId={classId} onChange={onChange} /> : null}
    </Box>
  );
}
