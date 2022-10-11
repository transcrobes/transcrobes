import { useEffect, useState } from "react";
import { BooleanField, FunctionField, Show, SimpleShowLayout, TextField, useTranslate } from "react-admin";
import { useParams } from "react-router-dom";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import { DOCS_DOMAIN, ImportFirstSuccessStats, IMPORTS_YT_VIDEO, PROCESS_TYPE, reverseEnum } from "../lib/types";
import { DocumentProgress } from "../components/DocumentProgress";
import { useAppSelector } from "../app/hooks";

const DATA_SOURCE = "ImportShow.tsx";

export default function ImportShow() {
  const [stats, setStats] = useState<ImportFirstSuccessStats>();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const { id } = useParams();
  const translate = useTranslate();
  useEffect(() => {
    if (window.componentsConfig.proxy.loaded) {
      (async function () {
        const locStats: ImportFirstSuccessStats =
          await window.componentsConfig.proxy.sendMessagePromise<ImportFirstSuccessStats>({
            source: DATA_SOURCE,
            type: "getFirstSuccessStatsForImport",
            value: { importId: id, fromLang },
          });
        setStats(locStats);
      })();
    }
  }, [window.componentsConfig.proxy.loaded]);
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
