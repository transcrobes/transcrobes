import { FC } from "react";
import {
  BooleanField,
  FieldProps,
  FunctionField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";
import { Content, CONTENT_TYPE, PROCESSING, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import { ImportProgress } from "../imports/ImportProgress";
import { HelpShowActions } from "../components/HelpShowActions";
import CacheSwitch from "./CacheSwitch";

const ContentShow: FC<FieldProps<Content>> = (props) => (
  <Show
    actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/contents/" />}
    {...props}
  >
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="description" />
      <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
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
      <CacheSwitch label="Offline?" props={props} />
      <hr />
      <h3>Progress</h3>
      <ImportProgress />
    </SimpleShowLayout>
  </Show>
);

export default ContentShow;
