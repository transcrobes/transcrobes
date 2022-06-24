import { useTheme } from "@mui/system";
import { useEffect, useState } from "react";
import { useRecordContext } from "react-admin";
import ContentAnalysis from "../components/ContentAnalysis";
import { CalculatedContentStats, Content, noop } from "../lib/types";

const DATA_SOURCE = "ContentStatsField";

export function ContentStatsField({ label }: { label?: string }) {
  const record = useRecordContext<Content>();
  const theme = useTheme();
  const [stats, setStats] = useState<CalculatedContentStats | null>();
  const [colour, setColour] = useState(theme.palette.background.default);
  useEffect(() => {
    if (window.componentsConfig.proxy.loaded) {
      (async function () {
        if (!record.theImport) return;
        const locStats: CalculatedContentStats | null =
          await window.componentsConfig.proxy.sendMessagePromise<CalculatedContentStats | null>({
            source: DATA_SOURCE,
            type: "getContentStatsForImport",
            value: { importId: record.theImport },
          });
        setStats(locStats);
      })();
    }
  }, [window.componentsConfig.proxy.loaded]);
  useEffect(() => {
    if (stats) {
      console.log("stats.knownChars / stats.chars", stats.knownChars, stats.chars);
      console.log("stats.knownWords / stats.knownWords", stats.knownWords, stats.knownWords);
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
    <></>
  );
}
