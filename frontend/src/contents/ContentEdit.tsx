/* eslint react/jsx-key: off */
import React, { FC } from "react";
import {
  Edit,
  SimpleForm,
  TextField,
  TextInput,
  required,
  FieldProps,
  BooleanInput,
} from "react-admin";
import { Content } from "../lib/types";

const ContentEdit: FC<FieldProps<Content>> = (props) => (
  <Edit {...props}>
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
