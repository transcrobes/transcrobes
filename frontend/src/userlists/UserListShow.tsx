import { BooleanField, FunctionField, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import { GRADE } from "../database/Schema";
import { ORDER_BY, PROCESSING, reverseEnum } from "../lib/types";
import { ListProgress } from "../stats/ListProgress";

function wordKnowledge(record: any) {
  return record.wordKnowledge ? reverseEnum(GRADE, record.wordKnowledge) : "Don't set";
}

export default function UserListShow() {
  return (
    <Show actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/wordlists/" />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ProcessingField label="Processing status" />
        <TextField source="nbToTake" />
        <TextField source="minimumAbsFrequency" />
        <TextField source="minimumDocFrequency" />
        <FunctionField source="orderBy" render={(record: any) => reverseEnum(ORDER_BY, record.orderBy)} />
        <FunctionField label="Set word knowledge" render={wordKnowledge} />
        <BooleanField source="shared" />
        <hr />
        <h3>Progress</h3>
        <ListProgress />
      </SimpleShowLayout>
    </Show>
  );
}
