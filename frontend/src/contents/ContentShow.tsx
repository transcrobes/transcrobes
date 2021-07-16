import React, { FC } from "react";
import {
  BooleanField,
  FieldProps,
  FunctionField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin"; // eslint-disable-line import/no-unresolved
import { Content, CONTENT_TYPE, PROCESSING, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";

const ContentShow: FC<FieldProps<Content>> = (props) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="description" />
      <ReferenceField label="Source import" source="theImport" reference="imports">
        <TextField source="title" />
      </ReferenceField>
      <FunctionField
        source="processing"
        render={(record: any) => reverseEnum(PROCESSING, record.processing)}
      />
      <FunctionField
        source="contentType"
        render={(record: any) => reverseEnum(CONTENT_TYPE, record.contentType)}
      />
      <TextField source="author" />
      <TextField source="cover" />
      <TextField label="Language" source="lang" />
      <BooleanField source="shared" />
      <ActionButton props={props} />
    </SimpleShowLayout>
  </Show>
);

export default ContentShow;
