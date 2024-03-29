import { useEffect, useState } from "react";
import { BooleanField, FunctionField, Show, SimpleShowLayout, TextField, useTranslate } from "react-admin";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { DocumentProgress } from "../components/DocumentProgress";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import UnixFieldAsDate from "../components/UnixFieldAsDate";
import { DOCS_DOMAIN, ImportFirstSuccessStats, IMPORTS_YT_VIDEO, PROCESS_TYPE } from "../lib/types";
import { platformHelper } from "../app/createStore";

const DATA_SOURCE = "ImportShow.tsx";

export default function ImportShow() {
  const [stats, setStats] = useState<ImportFirstSuccessStats | null>();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const { id } = useParams();
  const translate = useTranslate();
  useEffect(() => {
    if (id) {
      (async function () {
        const locStats: ImportFirstSuccessStats | null = await platformHelper.getFirstSuccessStatsForImport({
          importId: id,
          fromLang,
        });
        setStats(locStats);
      })();
    }
  }, []);
  return (
    <Show
      actions={
        <HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/imports/`} ytUrl={IMPORTS_YT_VIDEO} />
      }
    >
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <TextField source="importFile" />
        <TextField source="sourceUrl" />
        <UnixFieldAsDate source="createdAt" />
        <UnixFieldAsDate source="updatedAt" />
        <FunctionField
          source="processType"
          render={(record: any) => translate(`widgets.process_type.${PROCESS_TYPE[record.processType].toLowerCase()}`)}
        />
        <ProcessingField label={translate("resources.imports.processingStatus")} />
        <BooleanField source="shared" />
        <hr />
        <h3>{translate("resources.imports.progress")}</h3>
        <DocumentProgress stats={stats} />
      </SimpleShowLayout>
    </Show>
  );
}
