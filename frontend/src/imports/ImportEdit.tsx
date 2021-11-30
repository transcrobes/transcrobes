import { FC } from "react";
import { Edit, SimpleForm, TextField, TextInput, required, FieldProps } from "react-admin";
import { Import } from "../lib/types";

const ImportEdit: FC<FieldProps<Import>> = (props) => (
  <Edit {...props}>
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="Import name" source="title" validate={[required()]} />
      <TextInput label="Import description" multiline source="description" />
    </SimpleForm>
  </Edit>
);

export default ImportEdit;
