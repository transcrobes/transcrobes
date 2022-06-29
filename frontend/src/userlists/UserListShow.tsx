import { BooleanField, FunctionField, ReferenceField, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import { GRADE } from "../database/Schema";
import { DOCS_DOMAIN, ORDER_BY, reverseEnum, USERLISTS_YT_VIDEO } from "../lib/types";
import { ListProgress } from "../stats/ListProgress";

function wordKnowledge(record: any) {
  return record.wordKnowledge ? reverseEnum(GRADE, record.wordKnowledge) : "Don't set";
}

export default function UserListShow() {
  return (
    <Show
      actions={
        <HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/wordlists/`} ytUrl={USERLISTS_YT_VIDEO} />
      }
    >
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
