import { Box } from "@mui/system";
import { useEffect, useState } from "react";
import {
  BooleanField,
  FunctionField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
  useGetOne,
  useStore,
  useTranslate,
} from "react-admin";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { DocumentProgress } from "../components/DocumentProgress";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import UnixFieldAsDate from "../components/UnixFieldAsDate";
import { CONTENT_TYPE, Content, DOCS_DOMAIN, ImportFirstSuccessStats, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";
import { ContentGoalSelector } from "./ContentGoalSelector";
import { platformHelper } from "../app/createStore";

export default function ContentShow() {
  const { id = "" } = useParams();
  const { data: content, isLoading } = useGetOne<Content>("contents", { id });
  const [stats, setStats] = useState<ImportFirstSuccessStats | null>();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const [includeIgnored] = useStore("preferences.includeIgnored", false);
  const [includeNonDict] = useStore("preferences.includeNonDict", false);
  const translate = useTranslate();
  useEffect(() => {
    (async function () {
      if (isLoading || !content?.theImport) return;
      const locStats: ImportFirstSuccessStats | null = await platformHelper.getFirstSuccessStatsForImport({
        importId: content.theImport,
        fromLang,
        includeIgnored,
        includeNonDict,
      });
      setStats(locStats);
    })();
  }, [content]);

  return (
    <Box>
      <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/contents/`} />}>
        <ContentGoalSelector showResult />
        <SimpleShowLayout>
          <TextField source="id" />
          <TextField source="title" />
          <TextField source="description" />
          <UnixFieldAsDate source="createdAt" />
          <UnixFieldAsDate source="updatedAt" />
          <ReferenceField source="theImport" reference="imports" link="show">
            <TextField source="title" />
          </ReferenceField>
          <ProcessingField label={translate("resources.contents.processingStatus")} />
          <FunctionField source="contentType" render={(record) => reverseEnum(CONTENT_TYPE, record?.contentType)} />
          <TextField source="author" />
          <TextField source="cover" />
          <TextField source="lang" />
          <BooleanField source="shared" />
          <TextField source="sourceUrl" />
          <ActionButton label={translate("resources.contents.action")} />
          <CacheSwitch label={translate("resources.contents.offline")} />
          <hr />
          <h3>{translate("resources.contents.progress")}</h3>
          <DocumentProgress stats={stats} />
        </SimpleShowLayout>
      </Show>
    </Box>
  );
}
