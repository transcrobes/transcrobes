import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { AnalysisAccuracy } from "../lib/types";
import ContentAnalysisAccuracy from "./ContentAnalysisAccuracy";

const DATA_SOURCE = "ContentStatsField";

export function ContentStatsAccuracyField({ label }: { label?: string }) {
  const record = useRecordContext();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  let importId = "";
  if (Object.hasOwn(record, "theImport")) {
    importId = record.theImport;
  } else {
    importId = record.id.toString();
  }
  const [accuracy, setAccuracy] = useState<AnalysisAccuracy | null>();

  useEffect(() => {
    if (window.componentsConfig.proxy.loaded) {
      (async function () {
        if (!importId) return;
        const locStats: AnalysisAccuracy | null =
          await window.componentsConfig.proxy.sendMessagePromise<AnalysisAccuracy | null>({
            source: DATA_SOURCE,
            type: "getContentAccuracyStatsForImport",
            value: { importId, fromLang },
          });
        setAccuracy(locStats);
      })();
    }
  }, [window.componentsConfig.proxy.loaded]);
  return accuracy ? <ContentAnalysisAccuracy accuracy={accuracy} proxy={window.componentsConfig.proxy} /> : <></>;
}
