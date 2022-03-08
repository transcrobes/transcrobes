import { FC } from "react";
import {
  Edit,
  FieldProps,
  NumberInput,
  ReferenceInput,
  required,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
} from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { UserDictionary } from "../lib/types";

const AEdit: FC<FieldProps<UserDictionary>> = (props) => (
  <Edit
    actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/userdictionaries/" />}
    {...props}
  >
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="Dictionary name" source="title" validate={[required()]} />
      <TextInput label="Dictionary description" multiline source="description" />
    </SimpleForm>
  </Edit>
);

export default AEdit;
