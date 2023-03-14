import { Box } from "@mui/system";
import { ReactElement, useRef } from "react";
import { store } from "../../app/createStore";
import { useAppSelector, useJssStyles } from "../../app/hooks";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import { isScriptioContinuo } from "../../lib/funclib";
import { DEFAULT_VIDEO_READER_CONFIG_STATE, KeyedModels } from "../../lib/types";

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

  if (ref.current && models) {
    enrichETFElements(ref.current, currentCue, readerConfig, models, store, etfClasses);
  }
  return (
    <Box
      sx={{
        backdropFilter: readerConfig.subBackgroundBlur ? "blur(6px)" : undefined,
        minHeight: readerConfig.subBackgroundBlur ? "6em" : undefined,
        paddingLeft: readerConfig.subBackgroundBlur ? "10em" : undefined,
        paddingRight: readerConfig.subBackgroundBlur ? "10em" : undefined,
        maxWidth: `${(readerConfig.subBoxWidth || 1) * 100}%`,
      }}
      ref={ref}
    />
  );
}

export default SubtitleControl;
