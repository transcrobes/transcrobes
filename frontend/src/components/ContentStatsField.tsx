import { useTheme } from "@mui/system";
import { useEffect, useState } from "react";
import { useRecordContext, useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { CalculatedContentStats, noop } from "../lib/types";
import ContentAnalysis from "./ContentAnalysis";

const DATA_SOURCE = "ContentStatsField";

export function ContentStatsField({ label }: { label?: string }) {
  const record = useRecordContext();
  const translate = useTranslate();
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  let importId = "";
  if (Object.hasOwn(record, "theImport")) {
    importId = record.theImport;
  } else {
    importId = record.id.toString();
  }
  const theme = useTheme();
  const [stats, setStats] = useState<CalculatedContentStats | null>();
  const [colour, setColour] = useState(theme.palette.background.default);
  useEffect(() => {
    if (window.componentsConfig.proxy.loaded) {
      (async function () {
        if (!importId) return;
        const locStats: CalculatedContentStats | null =
          await window.componentsConfig.proxy.sendMessagePromise<CalculatedContentStats | null>({
            source: DATA_SOURCE,
            type: "getContentStatsForImport",
            value: { importId, fromLang },
          });
        setStats(locStats);
      })();
    }
  }, [window.componentsConfig.proxy.loaded]);
  useEffect(() => {
    if (stats) {
      if (
        stats.knownChars / stats.chars < 0.7 ||
        stats.knownWords / stats.knownWords < 0.5 ||
        stats.meanSentenceLength > 40
      ) {
        setColour(theme.palette.warning.main);
      } else if (
        stats.knownChars / stats.chars < 0.8 ||
        stats.knownWords / stats.knownWords < 0.8 ||
        stats.meanSentenceLength > 30
      ) {
        setColour(theme.palette.info.main);
      } else {
        setColour(theme.palette.success.main);
      }
    }
  }, [stats]);

  const boxRadii = "10px 10px 10px 10px";
  const leftButtonRadii = "10px 10px 10px 10px";

  return stats ? (
    <ContentAnalysis
      fromLang={fromLang}
      boxRadii={boxRadii}
      leftButtonRadii={leftButtonRadii}
      rightButtonRadii={""}
      knownChars={stats?.knownChars || 0}
      chars={stats?.chars || 0}
      knownWords={stats?.knownWords || 0}
      words={stats?.words || 0}
      knownCharsTypes={stats?.knownCharsTypes || 0}
      charsTypes={stats?.charsTypes || 0}
      knownWordsTypes={stats?.knownWordsTypes || 0}
      wordsTypes={stats?.wordsTypes || 0}
      meanSentenceLength={stats?.meanSentenceLength || 0}
      showRemove={false}
      setRemoved={noop}
      colour={colour || ""}
    />
  ) : (
    <>{translate("resources.contents.loading")}</>
  );
}
