import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { AnalysisAccuracy } from "../lib/types";
import ContentAnalysisAccuracy from "./ContentAnalysisAccuracy";
import { platformHelper } from "../app/createStore";

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
    (async function () {
      if (!importId) return;
      // @ts-ignore FIXME:
      const locStats: AnalysisAccuracy | null = await platformHelper.getContentAccuracyStatsForImport({
        importId,
        fromLang,
      });
      setAccuracy(locStats);
    });
  }, []);
  return accuracy ? <ContentAnalysisAccuracy accuracy={accuracy} proxy={platformHelper} /> : <></>;
}
