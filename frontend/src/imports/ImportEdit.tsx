import { FC } from "react";
import { Edit, FieldProps, required, SimpleForm, TextField, TextInput } from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { Import } from "../lib/types";

const ImportEdit: FC<FieldProps<Import>> = (props) => (
  <Edit actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/imports/" />} {...props}>
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="Import name" source="title" validate={[required()]} />
      <TextInput label="Import description" multiline source="description" />
    </SimpleForm>
  </Edit>
);

export default ImportEdit;
