import { FC, useEffect, useState } from "react";
import { BooleanField, FieldProps, FunctionField, Show, SimpleShowLayout, TextField } from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { Import, ImportFirstSuccessStats, PROCESSING, PROCESS_TYPE, reverseEnum } from "../lib/types";
import { ImportProgress } from "./ImportProgress";

const DATA_SOURCE = "ImportShow.tsx";

const ImportShow: FC<FieldProps<Import>> = (props) => {
  const [stats, setStats] = useState<ImportFirstSuccessStats>();
  useEffect(() => {
    (async function () {
      const locStats: ImportFirstSuccessStats =
        await window.componentsConfig.proxy.sendMessagePromise<ImportFirstSuccessStats>({
          source: DATA_SOURCE,
          type: "getFirstSuccessStatsForImport",
          value: { importId: (props as any).id },
        });
      setStats(locStats);
    })();
  }, []);

  return (
    <Show actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/imports/" />} {...props}>
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
};

export default ImportShow;
