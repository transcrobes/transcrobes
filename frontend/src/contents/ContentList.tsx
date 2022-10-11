import { Typography } from "@mui/material";
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
import HelpButton from "../components/HelpButton";
import { ListEmpty } from "../components/ListEmpty";
import { ProcessingField } from "../components/ProcessingField";
import { CONTENT_TYPE, DOCS_DOMAIN, IS_DEV, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";
import { ContentStatsField } from "../components/ContentStatsField";
import { ContentStatsAccuracyField } from "../components/ContentStatsAccuracyField";
import { useAppSelector } from "../app/hooks";

function ListActions({ empty }: { empty?: boolean }) {
  return (
    <TopToolbar
      sx={{
        maxHeight: "64px",
      }}
    >
      {!empty && <SortButton fields={["createdAt", "title", "processing"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/contents/`} />
    </TopToolbar>
  );
}

function EmtpyList() {
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
        <Link to="/imports">Imported content</Link> will appear here.
      </Typography>
    </ListEmpty>
  );
}

export default function ContentList() {
  const user = useAppSelector((state) => state.userData);
  const translate = useTranslate();
  return (
    <List
      queryOptions={{ refetchInterval: 5000 }}
      empty={<EmtpyList />}
      actions={<ListActions />}
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
        <ActionButton label={translate("resources.contents.action")} />
        <CacheSwitch label={translate("resources.contents.offline")} />
      </Datagrid>
    </List>
  );
}
