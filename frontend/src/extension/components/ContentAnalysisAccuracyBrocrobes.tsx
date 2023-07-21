import { Box } from "@mui/system";
import _ from "lodash";
import * as React from "react";
import { useAppSelector } from "../../app/hooks";
import ContentAnalysisAccuracy from "../../components/ContentAnalysisAccuracy";
import { AnalysisAccuracy, ContentStats, EXTENSION_READER_ID } from "../../lib/types";
import type { DataManager } from "../../data/types";

export default function ContentAnalysisAccuracyBrocrobes({ proxy }: { proxy: DataManager }) {
  const outsideStats = useAppSelector((state) => state.stats);
  const readerConfig = useAppSelector((state) => state.extensionReader[EXTENSION_READER_ID]);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);

  const [accuracy, setAccuracy] = React.useState<AnalysisAccuracy | null>(null);

  const debounce = React.useCallback(
    _.debounce(
      (stats: ContentStats) => {
        proxy.getContentAccuracyStatsForImport({ allWordsInput: stats.words, fromLang }).then((accuracy) => {
          setAccuracy(accuracy);
        });
      },
      1000,
      { maxWait: 2000 },
    ),
    [],
  );

  React.useEffect(() => {
    debounce(outsideStats);
  }, [outsideStats.words]);

  const topFlat = readerConfig.analysisPosition === "top-right";
  const vertPosition = topFlat ? { top: 30 } : { bottom: 30 };
  return accuracy ? (
    <Box
      style={{
        zIndex: 1000,
        position: "fixed",
        right: "0",
        ...vertPosition,
      }}
    >
      <ContentAnalysisAccuracy accuracy={accuracy} proxy={proxy} />
    </Box>
  ) : (
    <></>
  );
}
