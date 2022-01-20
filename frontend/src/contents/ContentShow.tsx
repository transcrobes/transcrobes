import { FC, useEffect, useState } from "react";
import {
  BooleanField,
  FieldProps,
  FunctionField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
  useGetOne,
} from "react-admin";
import { HelpShowActions } from "../components/HelpShowActions";
import { ImportProgress } from "../imports/ImportProgress";
import { Content, CONTENT_TYPE, ImportFirstSuccessStats, PROCESSING, reverseEnum } from "../lib/types";
import ActionButton from "./ActionButton";
import CacheSwitch from "./CacheSwitch";

const DATA_SOURCE = "ContentShow.tsx";

const ContentShow: FC<FieldProps<Content>> = (props) => {
  const { data, loaded } = useGetOne<Content>("contents", (props as any).id);
  const [stats, setStats] = useState<ImportFirstSuccessStats>();
  useEffect(() => {
    (async function () {
      if (!loaded || !data || !data.theImport) return;
      const locStats: ImportFirstSuccessStats =
        await window.componentsConfig.proxy.sendMessagePromise<ImportFirstSuccessStats>({
          source: DATA_SOURCE,
          type: "getFirstSuccessStatsForImport",
          value: { importId: data.theImport },
        });
      setStats(locStats);
    })();
  }, [data]);
  return (
    <Show actions={<HelpShowActions helpUrl="https://transcrob.es/page/software/configure/contents/" />} {...props}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="title" />
        <TextField source="description" />
        <ReferenceField label="Source import" source="theImport" reference="imports" link="show">
          <TextField source="title" />
        </ReferenceField>
        <FunctionField source="processing" render={(record: any) => reverseEnum(PROCESSING, record.processing)} />
        <FunctionField source="contentType" render={(record: any) => reverseEnum(CONTENT_TYPE, record.contentType)} />
        <TextField source="author" />
        <TextField source="cover" />
        <TextField label="Language" source="lang" />
        <BooleanField source="shared" />
        <ActionButton props={props} />
        <CacheSwitch label="Offline?" props={props} />
        <hr />
        <h3>Progress</h3>
        <ImportProgress stats={stats} />
      </SimpleShowLayout>
    </Show>
  );
};

export default ContentShow;
