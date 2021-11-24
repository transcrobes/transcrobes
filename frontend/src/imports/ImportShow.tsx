import { FC } from "react";
import {
  BooleanField,
  FieldProps,
  FunctionField,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";
import { Import, PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";
import ImportDetails from "./ImportDetails";

const ImportShow: FC<FieldProps<Import>> = (props) => (
  <Show {...props}>
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
      <h3>Details</h3>
      <ImportDetails />
    </SimpleShowLayout>
  </Show>
);

export default ImportShow;
