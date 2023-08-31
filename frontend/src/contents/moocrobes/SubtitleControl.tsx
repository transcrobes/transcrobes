import { Box } from "@mui/system";
import { ReactElement, useEffect, useRef } from "react";
import { store } from "../../app/createStore";
import { useAppSelector, useJssStyles } from "../../app/hooks";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import { isScriptioContinuo } from "../../lib/funclib";
import { DEFAULT_VIDEO_READER_CONFIG_STATE, KeyedModels } from "../../lib/types";
import useWindowDimensions from "../../hooks/WindowDimensions";

interface Props {
  id: string;
  models: KeyedModels;
  currentCue: string;
}
function SubtitleControl({ currentCue, models, id }: Props): ReactElement {
  const readerConfig = useAppSelector((state) => state.videoReader[id] || DEFAULT_VIDEO_READER_CONFIG_STATE);
  const ref = useRef<HTMLDivElement>(null);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const etfClasses = useJssStyles({ ...readerConfig, scriptioContinuo: isScriptioContinuo(fromLang) });
  const blurPx = "10px";
  const dims = useWindowDimensions();
  const pseudo = {
    content: "''",
    flex: "1 1 auto",
    maxWidth: dims.width > 1500 ? "10em" : "5em",
    backdropFilter: `blur(${blurPx})`,
  };
  useEffect(() => {
    if (ref.current && models) {
      enrichETFElements(ref.current, currentCue, readerConfig, models, store, etfClasses, id, "/subtitles");
    }
  }, [currentCue]);
  return (
    <Box
      sx={{
        ...(readerConfig.subBackgroundBlur && {
          "&:before": pseudo,
          "&:after": pseudo,
        }),
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          backdropFilter: !readerConfig.subBackgroundBlur ? undefined : `blur(${blurPx})`,
          minHeight: !readerConfig.subBackgroundBlur ? undefined : "6em",
          maxWidth: `${(readerConfig.subBoxWidth || 1) * 100}%`,
        }}
        ref={ref}
      />
    </Box>
  );
}

export default SubtitleControl;
