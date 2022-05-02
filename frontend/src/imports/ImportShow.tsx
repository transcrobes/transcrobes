import { useEffect, useState } from "react";
import { BooleanField, FunctionField, Show, SimpleShowLayout, TextField } from "react-admin";
import { useParams } from "react-router-dom";
import { HelpShowActions } from "../components/HelpShowActions";
import { ImportFirstSuccessStats, PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";
import { ImportProgress } from "./ImportProgress";

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
    <Show actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/imports/" />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <TextField source="importFile" />
        <FunctionField source="processType" render={(record: any) => reverseEnum(PROCESS_TYPE, record.processType)} />
        <FunctionField source="processing" render={(record: any) => reverseEnum(PROCESSING, record.processing)} />
        <BooleanField source="shared" />
        <hr />
        <h3>Progress</h3>
        <ImportProgress stats={stats} />
      </SimpleShowLayout>
    </Show>
  );
}
