import { useEffect, useState } from "react";
import { BooleanField, FunctionField, ReferenceField, Show, SimpleShowLayout, TextField, useGetOne } from "react-admin";
import { useParams } from "react-router-dom";
import { HelpShowActions } from "../components/HelpShowActions";
import { ProcessingField } from "../components/ProcessingField";
import { DocumentProgress } from "../components/DocumentProgress";
import { Content, CONTENT_TYPE, DOCS_DOMAIN, ImportFirstSuccessStats, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";

const DATA_SOURCE = "ContentShow.tsx";

export default function ContentShow() {
  const { id = "" } = useParams();
  const { data, isLoading } = useGetOne<Content>("contents", { id });
  const [stats, setStats] = useState<ImportFirstSuccessStats | null>();
  useEffect(() => {
    if (window.componentsConfig.proxy.loaded) {
      (async function () {
        if (isLoading || !data?.theImport) return;
        const locStats: ImportFirstSuccessStats | null =
          await window.componentsConfig.proxy.sendMessagePromise<ImportFirstSuccessStats | null>({
            source: DATA_SOURCE,
            type: "getFirstSuccessStatsForImport",
            value: { importId: data.theImport },
          });
        setStats(locStats);
      })();
    }
  }, [data, window.componentsConfig.proxy.loaded]);
  return (
    <Show actions={<HelpShowActions helpUrl={`//${DOCS_DOMAIN}/page/software/configure/contents/`} />}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <ProcessingField label="Processing status" />
        <FunctionField
          source="contentType"
          render={(record: Content) => reverseEnum(CONTENT_TYPE, record.contentType)}
        />
        <TextField source="author" />
        <TextField source="cover" />
        <TextField label="Language" source="lang" />
        <BooleanField source="shared" />
        <ActionButton />
        <CacheSwitch label="Offline?" />
        <hr />
        <h3>Progress</h3>
        <DocumentProgress stats={stats} />
      </SimpleShowLayout>
    </Show>
  );
}
