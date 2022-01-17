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
import { HelpShowActions } from "../components/HelpShowActions";
import { GRADE } from "../database/Schema";
import { ORDER_BY, PROCESSING, reverseEnum, UserList } from "../lib/types";
import { UserListProgress } from "./UserListProgress";

function wordKnowledge(record: any) {
  return record.wordKnowledge ? reverseEnum(GRADE, record.wordKnowledge) : "Don't set";
}

const UserListShow: FC<FieldProps<UserList>> = (props) => (
  <Show
    actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/wordlists/" />}
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
        label="Processing status"
        render={(record: any) => reverseEnum(PROCESSING, record.processing)}
      />
      <TextField source="nbToTake" />
      <TextField source="minimumAbsFrequency" />
      <TextField source="minimumDocFrequency" />
      <FunctionField
        source="orderBy"
        render={(record: any) => reverseEnum(ORDER_BY, record.orderBy)}
      />
      {/* <BooleanField source="wordsAreKnown" /> */}
      <FunctionField label="Set word knowledge" render={wordKnowledge} />
      <BooleanField source="shared" />
      <hr />
      <h3>Progress</h3>
      <UserListProgress />
    </SimpleShowLayout>
  </Show>
);

export default UserListShow;
