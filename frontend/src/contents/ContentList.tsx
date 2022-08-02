import { Typography } from "@mui/material";
import { Datagrid, FunctionField, Link, List, ReferenceField, SortButton, TextField, TopToolbar } from "react-admin";
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
    <TopToolbar>
      {!empty && <SortButton fields={["createdAt", "title", "processing"]} />}
      <HelpButton url={`//${DOCS_DOMAIN}/page/software/configure/contents/`} />
    </TopToolbar>
  );
}

function EmtpyList() {
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
  return (
    <List
      queryOptions={{ refetchInterval: 5000 }}
      empty={<EmtpyList />}
      actions={<ListActions />}
      sort={{ field: "createdAt", order: "DESC" }}
    >
      <Datagrid rowClick="show">
        <TextField source="title" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ProcessingField label="Processing status" />
        <FunctionField source="contentType" render={(record: any) => reverseEnum(CONTENT_TYPE, record.contentType)} />
        <ContentStatsField label="Content Stats" />
        {user.showResearchDetails && <ContentStatsAccuracyField label="Accuracy" />}
        <ActionButton label="Action" />
        <CacheSwitch label="Offline?" />
      </Datagrid>
    </List>
  );
}
