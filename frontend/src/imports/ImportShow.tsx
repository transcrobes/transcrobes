import { useEffect, useState } from "react";
import { BooleanField, FunctionField, Show, SimpleShowLayout, TextField } from "react-admin";
import { useParams } from "react-router-dom";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import { DOCS_DOMAIN, ImportFirstSuccessStats, IMPORTS_YT_VIDEO, PROCESS_TYPE, reverseEnum } from "../lib/types";
import { DocumentProgress } from "../components/DocumentProgress";

const DATA_SOURCE = "ImportShow.tsx";

export default function ImportShow() {
  const [stats, setStats] = useState<ImportFirstSuccessStats>();
  const { id } = useParams();
  useEffect(() => {
    if (window.componentsConfig.proxy.loaded) {
      (async function () {
        const locStats: ImportFirstSuccessStats =
          await window.componentsConfig.proxy.sendMessagePromise<ImportFirstSuccessStats>({
            source: DATA_SOURCE,
            type: "getFirstSuccessStatsForImport",
            value: { importId: id },
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
        <FunctionField source="processType" render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)} />
        <ProcessingField label="Processing status" />
        <BooleanField source="shared" />
        <hr />
        <h3>Progress</h3>
        <DocumentProgress stats={stats} />
      </SimpleShowLayout>
    </Show>
  );
}
