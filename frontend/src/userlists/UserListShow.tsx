import {
  BooleanField,
  FunctionField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
  useTranslate,
} from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import { GRADE } from "../workers/rxdb/Schema";
import { DOCS_DOMAIN, ORDER_BY, reverseEnum, USERLISTS_YT_VIDEO } from "../lib/types";
import { ListProgress } from "../stats/ListProgress";

function wordKnowledge(record: any) {
  // return record.wordKnowledge ? reverseEnum(GRADE, record.wordKnowledge) : "Don't set";
  return record.wordKnowledge ? GRADE[record.wordKnowledge] : "dont_set";
}

export default function UserListShow() {
  const translate = useTranslate();
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
        <ReferenceField source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ProcessingField label={translate("resources.userlists.processingStatus")} />
        <TextField source="nbToTake" />
        <TextField source="minimumAbsFrequency" />
        <TextField source="minimumDocFrequency" />
        <FunctionField
          source="orderBy"
          render={(record: any) => translate(`widgets.order_by.${ORDER_BY[record.orderBy].toLowerCase()}`)}
        />
        <FunctionField
          label={translate("resources.userlists.setWordKnowledge")}
          render={(record: any) => translate(`widgets.set_knowledge.${wordKnowledge(record)}`)}
        />
        <BooleanField source="shared" />
        <hr />
        <h3>{translate("resources.userlists.progress")}</h3>
        <ListProgress />
      </SimpleShowLayout>
    </Show>
  );
}
