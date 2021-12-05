import { FC } from "react";
import {
  Edit,
  SimpleForm,
  TextField,
  TextInput,
  required,
  FieldProps,
  BooleanInput,
} from "react-admin";
import { HelpEditActions } from "../components/HelpEditActions";
import { Content } from "../lib/types";

const ContentEdit: FC<FieldProps<Content>> = (props) => (
  <Edit
    actions={<HelpEditActions helpUrl="https://transcrob.es/page/software/configure/contents/" />}
    {...props}
  >
    <SimpleForm redirect="list">
      <TextField source="id" />
      <TextInput label="Content name" source="title" validate={[required()]} />
      <TextInput label="Content description" multiline source="description" />
      <TextInput source="author" />
      <TextInput source="cover" />
      <TextInput label="Language" source="lang" />
      <BooleanInput label="Shared" source="shared" />
    </SimpleForm>
  </Edit>
);

export default ContentEdit;
