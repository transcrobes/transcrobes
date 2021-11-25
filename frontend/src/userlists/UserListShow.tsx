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
import { ORDER_BY, PROCESSING, reverseEnum, UserList } from "../lib/types";
import UserListDetails from "./UserListDetails";

const UserListShow: FC<FieldProps<UserList>> = (props) => (
  <Show {...props}>
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
      <BooleanField source="wordsAreKnown" />
      <BooleanField source="shared" />
      <hr />
      <h3>Details</h3>
      <UserListDetails />
    </SimpleShowLayout>
  </Show>
);

export default UserListShow;
