import { SelectChangeEvent, Typography } from "@mui/material";
import { useState } from "react";
import {
  Datagrid,
  FunctionField,
  Link,
  List,
  ReferenceField,
  SortButton,
  TextField,
  TopToolbar,
  useTranslate,
} from "react-admin";
import { useAppSelector } from "../app/hooks";
import { ContentStatsAccuracyField } from "../components/ContentStatsAccuracyField";
import { ContentStatsField } from "../components/ContentStatsField";
import ContentValueField from "../components/ContentValueField";
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { ProcessingField } from "../components/ProcessingField";
import { CONTENT_TYPE, DOCS_DOMAIN } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";
import { ContentGoalSelector } from "./ContentGoalSelector";

function ListActions({ empty, onGoalChange }: { empty?: boolean; onGoalChange?: (event: SelectChangeEvent) => void }) {
  const translate = useTranslate();
  return (
    <TopToolbar
      sx={{
        maxHeight: "125px",
      }}
    >
      <ContentGoalSelector showResult={false} onChange={onGoalChange} />
      <Link to="/imports/create">{translate("resources.contents.import_create")}</Link>
      {!empty && <SortButton fields={["createdAt", "title", "processing"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/contents/`} />
    </TopToolbar>
  );
}

function EmptyList() {
  const translate = useTranslate();
  return (
    <ListEmpty createDisabled actions={<ListActions empty />}>
      <Typography
        sx={{
          fontSize: "1.5rem",
          textAlign: "center",
        }}
        variant="body1"
      >
        <Link to="/imports">{translate("resources.contents.empty_list")}</Link>
      </Typography>
    </ListEmpty>
  );
}

export default function ContentList() {
  const user = useAppSelector((state) => state.userData);
  const translate = useTranslate();
  const [userListId, setUserListId] = useState<string | undefined>(undefined);

  function onGoalChange(event: SelectChangeEvent) {
    setUserListId(event.target.value);
  }
  return (
    <List
      queryOptions={{ refetchInterval: 5000 }}
      empty={<EmptyList />}
      actions={<ListActions onGoalChange={onGoalChange} />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ProcessingField label={translate("resources.contents.processingStatus")} />
        <FunctionField
          source="contentType"
          render={(record: any) => translate(`widgets.content_type.${CONTENT_TYPE[record.contentType].toLowerCase()}`)}
        />
        <ContentStatsField label={translate("resources.contents.contentStats")} />
        {user.showResearchDetails && <ContentStatsAccuracyField label="Accuracy" />}
        {userListId && <ContentValueField label={translate("resources.contents.value")} userlistId={userListId} />}
        <ActionButton label={translate("resources.contents.action")} />
        <CacheSwitch label={translate("resources.contents.offline")} />
      </Datagrid>
    </List>
  );
}
