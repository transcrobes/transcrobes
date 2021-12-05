import { FC } from "react";
import {
  BooleanField,
  FieldProps,
  FunctionField,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { Import, PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";
import { ImportProgress } from "./ImportProgress";

const ImportShow: FC<FieldProps<Import>> = (props) => (
  <Show
    actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/imports/" />}
    {...props}
  >
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="importFile" />
      <FunctionField
        source="processType"
        render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)}
      />
      <FunctionField
        source="processing"
        render={(record: any) => reverseEnum(PROCESSING, record.processing)}
      />
      <BooleanField source="shared" />
      <hr />
      <h3>Progress</h3>
      <ImportProgress />
    </SimpleShowLayout>
  </Show>
);

export default ImportShow;
